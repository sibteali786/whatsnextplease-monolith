import jwt from 'jsonwebtoken';

export async function handler(event) {
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  const JWT_SECRET = 'randomSecretIDonotNeed';

  try {
    // Authorization header is lowercase in Lambda@Edge
    const authHeader = headers.authorization?.[0]?.value;
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Add user info to request headers
    request.headers['x-user-id'] = [
      {
        key: 'X-User-Id',
        value: decoded.sub || decoded.userId || 'unknown',
      },
    ];

    return request;
  } catch (error) {
    // Add console.log for CloudWatch
    console.log('Auth error:', {
      error: error.message,
      headers: headers,
      authHeader: headers.authorization?.[0]?.value,
    });

    return {
      status: '403',
      statusDescription: 'Forbidden',
      headers: {
        'content-type': [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
      body: JSON.stringify({
        message: 'Unauthorized access',
        error: error.message,
      }),
    };
  }
}
