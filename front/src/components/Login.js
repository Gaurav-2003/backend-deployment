import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  CircularProgress,
  IconButton
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    otp: ''
  });
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password
      });
      setSuccess(response.data.message || 'OTP sent to your email!');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    
    const trimmedOtp = formData.otp.trim();
    
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.verifyOtp({
        email: formData.email.trim(),
        otp: trimmedOtp
      });
      
      login(response.data.token, response.data.user);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authAPI.resendOtp({
        email: formData.email,
        type: 'LOGIN'
      });
      
      setSuccess(response.data.message || 'OTP resent successfully!');
      setFormData({ ...formData, otp: '' }); // Clear OTP field
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2
      }}
    >
      <Card sx={{ maxWidth: 450, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom fontWeight="bold">
            ConnectX
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            {step === 1 ? 'Sign in to your account' : 'Enter the OTP sent to your email'}
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {step === 1 ? (
            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                margin="normal"
                required
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Continue'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <Alert severity="info" sx={{ mb: 3 }}>
                We've sent a 6-digit code to <strong>{formData.email}</strong>
              </Alert>
              
              <TextField
                fullWidth
                label="OTP"
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                margin="normal"
                required
                inputProps={{ 
                  maxLength: 6,
                  style: { 
                    textAlign: 'center', 
                    fontSize: '24px', 
                    letterSpacing: '8px',
                    fontWeight: 'bold'
                  }
                }}
                placeholder="000000"
              />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Didn't receive the code?
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  onClick={handleResendOtp}
                  disabled={resendLoading}
                  startIcon={resendLoading ? <CircularProgress size={16} /> : <Refresh />}
                >
                  {resendLoading ? 'Sending...' : 'Resend OTP'}
                </Button>
              </Box>
              
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 2, mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Verify & Login'}
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back to Login
              </Button>
            </form>
          )}

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2">
              Don't have an account?{' '}
              <Link href="/register" underline="hover">
                Sign up
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;