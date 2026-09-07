from rest_framework import serializers
from .models import *

class ProjectCostSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectCost
        fields = '__all__'
