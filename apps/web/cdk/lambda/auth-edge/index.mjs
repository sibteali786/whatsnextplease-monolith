import jwt from 'jsonwebtoken';

export async function handler(event) {
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  const JWT_SECRET = 'randomSecretIDonotNeed';

  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return {
      status: '204',
      statusDescription: 'No Content',
      headers: {
        'access-control-allow-origin': [{ key: 'Access-Control-Allow-Origin', value: '*' }],
        'access-control-allow-methods': [{ key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' }],
        'access-control-allow-headers': [{ key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' }],
        'access-control-max-age': [{ key: 'Access-Control-Max-Age', value: '86400' }]
      }
    };
  }

  try {
    const authHeader = headers.authorization?.[0]?.value;
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    request.headers['x-user-id'] = [{
      key: 'X-User-Id',
      value: decoded.sub || decoded.userId || 'unknown'
    }];

    // Add CORS headers to successful requests
    request.headers['access-control-allow-origin'] = [{ key: 'Access-Control-Allow-Origin', value: '*' }];
    
    return request;
  } catch (error) {
    return {
      status: '403',
      statusDescription: 'Forbidden',
      headers: {
        'content-type': [{ key: 'Content-Type', value: 'application/json' }],
        'access-control-allow-origin': [{ key: 'Access-Control-Allow-Origin', value: '*' }]
      },
      body: JSON.stringify({ message: 'Unauthorized access', error: error.message })
    };
  }
}