# Authentication Configuration

This application supports two authentication providers that can be configured via environment variables:

## Providers

### 1. Firebase Authentication (Default)

- **Provider ID**: `firebase`
- **Features**: Email/password, Google OAuth, GitHub, Microsoft, Apple
- **Persistence**: Local and session storage support
- **Token Management**: Automatic refresh

### 2. Google Identity Services (GIS)

- **Provider ID**: `gis`
- **Features**: Google OAuth (One Tap and Popup)
- **Persistence**: Handled by Google
- **Token Management**: JWT-based

## Configuration

### Environment Variables

Set `VITE_AUTH_PROVIDER` in your `.env` file to choose the provider:

```env
# For Firebase Authentication
VITE_AUTH_PROVIDER=firebase

# For Google Identity Services
VITE_AUTH_PROVIDER=gis
```

### Firebase Configuration

When using Firebase (`VITE_AUTH_PROVIDER=firebase`), configure these variables:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Google Identity Services Configuration

When using GIS (`VITE_AUTH_PROVIDER=gis`), configure:

```env
VITE_GOOGLE_CLIENT_ID=your-client-id.googleusercontent.com
```

## Switching Providers

### From Firebase to GIS

1. Set up Google OAuth 2.0 credentials in Google Cloud Console
2. Update your `.env` file:
   ```env
   VITE_AUTH_PROVIDER=gis
   VITE_GOOGLE_CLIENT_ID=your-client-id.googleusercontent.com
   ```
3. Remove or comment out Firebase environment variables
4. Restart your development server

### From GIS to Firebase

1. Set up Firebase project and enable Authentication
2. Update your `.env` file:
   ```env
   VITE_AUTH_PROVIDER=firebase
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   # ... other Firebase config
   ```
3. Remove or comment out GIS environment variables
4. Restart your development server

## Feature Comparison

| Feature             | Firebase | GIS     |
| ------------------- | -------- | ------- |
| Email/Password      | ✅       | ❌      |
| Google OAuth        | ✅       | ✅      |
| GitHub OAuth        | ✅       | ❌      |
| Microsoft OAuth     | ✅       | ❌      |
| Apple OAuth         | ✅       | ❌      |
| One Tap Sign-in     | ❌       | ✅      |
| Token Refresh       | ✅       | Manual  |
| Persistence Control | ✅       | Limited |

## Development Tips

- **Testing**: You can switch providers during development to test both implementations
- **Fallback**: Keep both configurations in your `.env` file and just change `VITE_AUTH_PROVIDER`
- **Production**: Choose one provider for production and remove unused environment variables
- **Debugging**: Check browser console for authentication provider initialization messages

## Troubleshooting

### Common Issues

1. **"Missing required configuration"**: Ensure all required environment variables are set for your chosen provider
2. **"Unsupported authentication provider"**: Check that `VITE_AUTH_PROVIDER` is set to either `firebase` or `gis`
3. **Google OAuth errors**: Verify your Google Client ID is correct and has the right redirect URIs configured
4. **Firebase errors**: Ensure your Firebase project has Authentication enabled and the correct services are configured

### Debug Mode

To debug authentication issues, check the browser console for:

- Provider initialization messages
- Configuration validation errors
- Authentication flow errors
