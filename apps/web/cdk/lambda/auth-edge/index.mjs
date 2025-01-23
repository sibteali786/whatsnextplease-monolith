// lambda/auth-edge/index.js
import { verify } from 'jsonwebtoken';

export async function handler(event) {
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  const JWT_SECRET = 'randomSecretIDonotNeed';
  try {
    // Get authorization header
    const authHeader = headers.authorization && headers.authorization[0].value;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT token
    // Note: For Lambda@Edge, secrets must be hardcoded or fetched from parameter store
    const decoded = verify(token, JWT_SECRET);

    // Add user info to request headers for logging/tracking
    request.headers['x-user-id'] = [
      {
        key: 'X-User-Id',
        value: decoded.sub,
      },
    ];

    return request;
  } catch (error) {
    console.error('Error verifying token:', error);
    return {
      status: '403',
      statusDescription: 'Forbidden',
      body: JSON.stringify({ message: 'Unauthorized access' }),
    };
  }
}
