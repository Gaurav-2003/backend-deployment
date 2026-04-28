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
  Stepper,
  Step,
  StepLabel,
  IconButton
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    otp: ''
  });
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const steps = ['Account Details', 'Verify Email'];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateForm = () => {
    if (!formData.username || formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }

    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authAPI.register({
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      
      setSuccess(response.data.message || 'OTP sent to your email!');
      setActiveStep(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
      console.error('OTP Verification Error:', err.response?.data);
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
        type: 'REGISTRATION'
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
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom fontWeight="bold">
            Join ConnectX
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Create your account to start chatting
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {activeStep === 0 ? (
            <form onSubmit={handleRegister}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                margin="normal"
                required
                helperText="Minimum 3 characters"
              />
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                margin="normal"
                required
                helperText="We'll send a verification code to this email"
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
                helperText="Minimum 6 characters"
              />
              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
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
                {loading ? <CircularProgress size={24} /> : 'Create Account'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <Alert severity="info" sx={{ mb: 3 }}>
                We've sent a 6-digit verification code to <strong>{formData.email}</strong>
              </Alert>
              
              <TextField
                fullWidth
                label="Enter OTP"
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
                {loading ? <CircularProgress size={24} /> : 'Verify & Continue'}
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setActiveStep(0)}
                disabled={loading}
              >
                Back to Registration
              </Button>
            </form>
          )}

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2">
              Already have an account?{' '}
              <Link href="/login" underline="hover">
                Sign in
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Register;