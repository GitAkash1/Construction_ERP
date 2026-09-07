import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for initial auth check

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/check/');
      if (response.data.isAuthenticated) {
        setUser({ 
          username: response.data.username, 
          email: response.data.email,
          isAdmin: response.data.isAdmin,
          role: response.data.role,
          roleCode: response.data.roleCode,
          permissions: response.data.permissions || []
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login/', { username, password });
      setUser({ 
        username: response.data.username, 
        email: response.data.email,
        isAdmin: response.data.isAdmin,
        role: response.data.role,
        roleCode: response.data.roleCode,
        permissions: response.data.permissions || []
      });
      toast.success(response.data.detail || 'Successfully logged in');
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Invalid Username or Password';
      return { success: false, error: errorMsg };
    }
  };

  const signup = async (username, password, email) => {
    try {
      const response = await api.post('/auth/signup/', { username, password, email });
      setUser({ 
        username: response.data.username, 
        email: response.data.email,
        isAdmin: response.data.isAdmin,
        role: response.data.role || null,
        roleCode: response.data.roleCode || null,
        permissions: response.data.permissions || []
      });
      toast.success(response.data.detail || 'Successfully signed up');
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Signup failed';
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout/');
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      setUser(null);
      toast.info('Logged out successfully');
    }
  };

  const hasPermission = (code) => {
    if (!user) return false;
    if (user.roleCode === 'SUPER_ADMIN') return true;
    return user.permissions ? user.permissions.includes(code) : false;
  };

  const hasAnyPermission = (codes) => {
    if (!user) return false;
    if (user.roleCode === 'SUPER_ADMIN') return true;
    return codes.some(code => user.permissions?.includes(code));
  };

  const hasAllPermissions = (codes) => {
    if (!user) return false;
    if (user.roleCode === 'SUPER_ADMIN') return true;
    return codes.every(code => user.permissions?.includes(code));
  };

  const hasRole = (roleCode) => {
    if (!user) return false;
    return user.roleCode === roleCode;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      signup,
      logout,
      checkAuth,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};
