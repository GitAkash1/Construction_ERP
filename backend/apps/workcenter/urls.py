from django.urls import path
from .views import WorkCenterView

urlpatterns = [
    path('', WorkCenterView.as_view(), name='work-center'),
]
