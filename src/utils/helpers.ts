export const generateRoomId = () => {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
};

// Normalize and extract the first IP address
export const getClientIp = (req: any) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket.remoteAddress;

  return ip;
};

// OTP generation and validation
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const isOTPExpired = (expiresAt: Date) => {
  return new Date() > expiresAt;
};

export const validatePhoneNumber = (phoneNumber: string) => {
  // Basic phone number validation (can be enhanced)
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phoneNumber);
};