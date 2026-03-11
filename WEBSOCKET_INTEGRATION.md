# WebSocket Integration for Real-Time Notifications

This document explains the WebSocket implementation for real-time offer notifications in the Angular frontend.

## Overview

The application now uses **WebSocket with STOMP protocol** instead of HTTP polling to receive real-time notifications when:
- A new offer is created for a client
- New candidates are added to an existing offer

## Backend Configuration

### Spring Boot WebSocket Endpoint
- **WebSocket URL**: `http://localhost:8080/ws` (development)
- **Protocol**: STOMP over SockJS
- **Destinations**:
  - `/user/queue/notifications` - User-specific notifications (requires authentication)
  - `/topic/client/{clientId}/notifications` - Client-specific topic (fallback)

### Notification Message Format
```java
{
  "type": "OFFER_CREATED" | "CANDIDATES_ADDED",
  "title": "Notification title",
  "message": "Notification message",
  "clientId": 123,
  "offerId": 456,
  "timestamp": "2024-03-10T10:30:00"
}
```

## Frontend Implementation

### 1. Dependencies
Installed packages:
- `@stomp/stompjs` - STOMP client library
- `sockjs-client` - WebSocket fallback support
- `@types/sockjs-client` - TypeScript definitions

### 2. Key Components

#### WebSocketService (`websocket.service.ts`)
Manages WebSocket connections:
- `connect(username)` - Establishes WebSocket connection
- `subscribeToNotifications(username)` - Subscribes to user-specific queue
- `subscribeToClientTopic(clientId)` - Subscribes to client topic (fallback)
- `getNotifications()` - Returns Observable of incoming notifications
- `disconnect()` - Closes WebSocket connection

#### NotificationService (Updated)
Enhanced with WebSocket integration:
- `initWebSocketConnection(username)` - Initializes WebSocket for logged-in user
- `getNotifications()` - Returns Observable of notifications
- `handleNotification()` - Processes incoming notifications and shows snackbar

#### LayoutComponent (Updated)
- Initializes WebSocket connection when client logs in
- Subscribes to real-time notifications
- Plays notification sound when new offers arrive
- Shows snackbar notifications

#### OffersComponent (Updated)
- Subscribes to WebSocket notifications
- Automatically reloads offers when new notifications arrive
- No more HTTP polling required

### 3. Environment Configuration

**Development** (`environment.ts`):
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  wsUrl: 'http://localhost:8080/ws',
  keycloak: { ... }
};
```

**Production** (`environment.prod.ts`):
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-production-domain.com/api',
  wsUrl: 'https://your-production-domain.com/ws'
};
```

## How It Works

### Connection Flow
1. Client logs in and profile is loaded
2. `LayoutComponent` gets client email from profile
3. WebSocket connection is established using client's email/username
4. Client subscribes to `/user/queue/notifications`
5. Backend sends notifications to specific user queue

### Notification Flow
1. Admin creates offer or adds candidates (backend)
2. Backend publishes notification via `WebSocketNotificationService`
3. Frontend receives notification through WebSocket
4. `NotificationService` processes notification
5. Snackbar notification is shown to user
6. Audio alert is played
7. `OffersComponent` automatically reloads offers list

### Auto-Reconnection
- The WebSocket client automatically attempts to reconnect on connection loss
- Maximum 5 reconnection attempts with 5-second delay
- Heartbeat mechanism keeps connection alive

## Usage Examples

### Backend (Spring Boot)
```java
// In OfferService.java
NotificationMessage notification = new NotificationMessage(
    "OFFER_CREATED",
    "Nouvelle offre reçue",
    "Une nouvelle offre a été créée pour votre demande.",
    clientId,
    offerId,
    LocalDateTime.now()
);

webSocketNotificationService.notifyClientByUsername(
    clientUsername, 
    notification
);
```

### Frontend (Angular)
The WebSocket connection is automatically initialized in `LayoutComponent`:

```typescript
// Get client profile
this.clientService.getMe().subscribe(client => {
  // Connect to WebSocket
  this.notificationService.initWebSocketConnection(client.emailAddress);
  
  // Subscribe to notifications
  this.notificationService.getNotifications().subscribe(notification => {
    console.log('Received:', notification);
  });
});
```

## Security Considerations

1. **Authentication**: WebSocket connections use the same JWT token as HTTP requests
2. **User-specific queues**: Each client receives only their own notifications
3. **CORS**: Ensure WebSocket endpoint is configured in backend CORS settings

## Troubleshooting

### WebSocket Connection Issues
- Check browser console for connection errors
- Verify backend WebSocket endpoint is running
- Ensure CORS settings allow WebSocket connections
- Check authentication token is valid

### Notifications Not Received
- Verify client email matches the username used in backend
- Check browser console for subscription confirmations
- Ensure backend is sending to correct destination
- Test with fallback topic subscription using clientId

### Audio Not Playing
- Ensure user has interacted with the page (click/touch) to unlock audio
- Check browser audio permissions
- Verify AudioContext is initialized properly

## Benefits Over HTTP Polling

1. **Real-time updates** - Instant notification delivery
2. **Reduced server load** - No repeated HTTP requests
3. **Better UX** - Immediate feedback to users
4. **Lower bandwidth** - Single persistent connection vs multiple HTTP calls
5. **Scalability** - More efficient for multiple concurrent users

## Future Enhancements

- [ ] Add reconnection status indicator in UI
- [ ] Implement message queue for offline notifications
- [ ] Add notification history panel
- [ ] Support for different notification types (contract, demande, etc.)
- [ ] Add notification preferences/settings
- [ ] Implement browser push notifications

## Testing

### Manual Testing
1. Open application as Client A in browser
2. Login as Admin in another browser/tab
3. Create an offer for Client A
4. Verify Client A receives notification instantly
5. Check that offers list auto-refreshes

### Console Logs
Monitor these logs for debugging:
- `✅ [LAYOUT] Client loaded: {email}`
- `WebSocket Connected`
- `Subscribed to /user/queue/notifications`
- `🔔 [LAYOUT] WebSocket notification received`
- `Received notification: {notification}`

## Spring Boot WebSocket Configuration Required

Ensure your Spring Boot application has WebSocket configured properly:

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }
    
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins("http://localhost:4200")
                .withSockJS();
    }
}
```

## Notes

- Make sure to update production URLs in `environment.prod.ts`
- WebSocket connection is established per browser tab
- Connection is closed when user logs out or closes tab
- Notifications are processed even if offers page is not active
