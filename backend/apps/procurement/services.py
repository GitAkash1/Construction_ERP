"""
Business logic services for the UAT workflow.
All critical operations use transaction.atomic() to ensure data integrity.
"""
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date

from apps.procurement.models import GoodsReceiptItem, PurchaseOrderItem, GoodsReceipt
from apps.inventory.models import StockTransaction, Material
from apps.sites.models import SiteConsumptionItem, SiteConsumption
from apps.projects.models import BOQItem


def receive_goods(goods_receipt: GoodsReceipt, items_data: list, created_by=None):
    """
    Atomically:
      1. Create GoodsReceiptItems
      2. Update PurchaseOrderItem.received_quantity
      3. Create StockTransaction (REC)
      4. Update Material.current_stock
      5. Update PurchaseOrder status
    items_data = [{'po_item_id': ..., 'received_quantity': ...}, ...]
    """
    with transaction.atomic():
        po = goods_receipt.purchase_order
        project = goods_receipt.project
        site = goods_receipt.site

        for item_data in items_data:
            po_item = PurchaseOrderItem.objects.select_for_update().get(pk=item_data['po_item_id'])

            if po_item.purchase_order_id != po.id:
                raise ValidationError("PO item does not belong to this Purchase Order.")

            qty = item_data['received_quantity']
            pending = po_item.quantity - po_item.received_quantity

            if qty <= 0:
                raise ValidationError(f"Received quantity must be positive for {po_item.material.material_name}.")

            if qty > pending:
                raise ValidationError(
                    f"Received quantity ({qty}) cannot exceed the pending PO quantity "
                    f"({pending}) for {po_item.material.material_name}."
                )

            # Create GoodsReceiptItem
            GoodsReceiptItem.objects.create(
                goods_receipt=goods_receipt,
                po_item=po_item,
                received_quantity=qty,
            )

            # Update PO item received qty
            po_item.received_quantity += qty
            po_item.save(update_fields=['received_quantity'])

            # Create stock transaction
            StockTransaction.objects.create(
                material=po_item.material,
                project=project,
                site=site,
                transaction_type='REC',
                quantity=qty,
                reference=f"GRN-{goods_receipt.id} / {po.po_number}",
                transaction_date=goods_receipt.receipt_date,
                remarks=f"Material received against PO {po.po_number}",
                created_by=created_by,
            )

            # Update global material stock
            material = Material.objects.select_for_update().get(pk=po_item.material_id)
            material.current_stock += qty
            material.save(update_fields=['current_stock'])

            # Update ProjectMaterialStock
            from apps.inventory.models import ProjectMaterialStock
            if po_item.boq_item:
                stock, created = ProjectMaterialStock.objects.select_for_update().get_or_create(
                    project=project,
                    boq_item=po_item.boq_item,
                    defaults={'issued_qty': 0}
                )
                stock.issued_qty += qty
                stock.save(update_fields=['issued_qty'])

        # Update PO status
        po.update_status()

    return goods_receipt


def consume_materials(consumption: SiteConsumption, items_data: list, created_by=None):
    """
    Atomically:
      1. Validate stock availability
      2. Validate BOQ balance
      3. Create SiteConsumptionItems
      4. Create StockTransaction (CON)
      5. Reduce Material.current_stock
      6. Update BOQItem.consumed_quantity
    items_data = [{'material_id': ..., 'boq_item_id': ..., 'quantity': ..., 'unit': ..., 'unit_price': ...}, ...]
    """
    with transaction.atomic():
        project = consumption.project
        site = consumption.site

        for item_data in items_data:
            qty = item_data['quantity']
            material = Material.objects.select_for_update().get(pk=item_data['material_id'])
            boq_item = None

            if qty <= 0:
                raise ValidationError(f"Consumption quantity must be positive for {material.material_name}.")

            # Validate stock and BOQ balance
            if item_data.get('boq_item_id'):
                boq_item = BOQItem.objects.select_for_update().get(pk=item_data['boq_item_id'])
                
                # Check ProjectMaterialStock (issued_qty)
                from apps.inventory.models import ProjectMaterialStock
                try:
                    project_stock = ProjectMaterialStock.objects.select_for_update().get(project=project, boq_item=boq_item)
                    available_stock = project_stock.issued_qty - boq_item.consumed_quantity
                    
                    if qty > available_stock:
                        raise ValidationError(
                            f"Consumption ({qty}) exceeds approved project stock ({available_stock}) "
                            f"for {material.material_name}. You must approve more material requests first."
                        )
                except ProjectMaterialStock.DoesNotExist:
                    raise ValidationError(
                        f"No approved material requests found for {material.material_name} in this BOQ."
                    )
            else:
                # Fallback to global stock check if no BOQ item is linked (for backwards compatibility)
                if material.current_stock < qty:
                    raise ValidationError(
                        f"Insufficient stock for {material.material_name}. "
                        f"Available: {material.current_stock} {material.unit}."
                    )

            # Create SiteConsumptionItem
            SiteConsumptionItem.objects.create(
                consumption=consumption,
                material=material,
                boq_item=boq_item,
                quantity=qty,
                unit=item_data.get('unit', material.unit),
                unit_price=item_data.get('unit_price', material.unit_price),
            )

            # Create stock-out transaction
            StockTransaction.objects.create(
                material=material,
                project=project,
                site=site,
                transaction_type='CON',
                quantity=qty,
                reference=f"CONS-{consumption.id}",
                transaction_date=consumption.consumption_date,
                remarks=f"Consumed for activity: {consumption.activity}",
                created_by=created_by,
            )

            # Reduce material stock
            material.current_stock -= qty
            material.save(update_fields=['current_stock'])

            # Update BOQ consumed quantity
            if boq_item:
                boq_item.consumed_quantity += qty
                boq_item.save(update_fields=['consumed_quantity'])

    return consumption
