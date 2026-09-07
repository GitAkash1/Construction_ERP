from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from .permissions import get_user_rbac_data

@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [] # Disable DRF's SessionAuth CSRF enforcement for login
    
    @method_decorator(ensure_csrf_cookie)
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            rbac_data = get_user_rbac_data(user)
            return Response({
                'detail': 'Successfully logged in.',
                'username': user.username,
                'email': user.email,
                'isAdmin': user.is_staff,
                'role': rbac_data['role'],
                'roleCode': rbac_data['roleCode'],
                'permissions': rbac_data['permissions']
            })
        else:
            return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

@method_decorator(csrf_exempt, name='dispatch')
class SignupView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [] # Disable DRF's SessionAuth CSRF enforcement for signup
    
    @method_decorator(ensure_csrf_cookie)
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email', '')
        
        if not username or not password:
            return Response({'detail': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if User.objects.filter(username=username).exists():
            return Response({'detail': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            
        user = User.objects.create_user(username=username, email=email, password=password, is_staff=False)
        login(request, user)
        return Response({
            'detail': 'Successfully signed up and logged in.',
            'username': user.username,
            'email': user.email,
            'isAdmin': user.is_staff,
            'role': None,
            'roleCode': None,
            'permissions': []
        }, status=status.HTTP_201_CREATED)

class LogoutView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        logout(request)
        return Response({'detail': 'Successfully logged out.'})

class CheckAuthView(APIView):
    permission_classes = [AllowAny]
    
    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        if request.user.is_authenticated:
            rbac_data = get_user_rbac_data(request.user)
            return Response({
                'isAuthenticated': True,
                'username': request.user.username,
                'email': request.user.email,
                'isAdmin': request.user.is_staff,
                'role': rbac_data['role'],
                'roleCode': rbac_data['roleCode'],
                'permissions': rbac_data['permissions']
            })
        else:
            return Response({
                'isAuthenticated': False
            })
