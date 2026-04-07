## Common Issues and Troubleshooting

### Trying to log in but it doesn't work

- Errors like `IDP token failed for ${username} , using legacy JWT` are expected for users who haven't been migrated to the new IDP yet. If you see this message, it means the system is falling back to the old authentication method, which should still work for those users. If you're unable to log in, please check the following:
  - Ensure you're using the correct username and password.
  - If you recently changed your password, try using the old password as well, as some users may not have been migrated yet.
  - Sometimes issue can also occur if you recently migrated to keycloak and now chaned AUTH_PROVIDER to cognito, now when you login you will fallback to JWT legacy ? why
    - Because database has cognito_sub already present but its for keycloak, so make sure to delete user cognito_sub from database and keycloak as well so to avoid future mismatch when you switch.
    - now try and it will work fine
