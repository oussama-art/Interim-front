# Spring Boot WebSocket Configuration

## CORS Error Fix

You're getting a CORS error because your Spring Boot backend is not allowing WebSocket connections from `http://localhost:4200`.

## Required Backend Configuration

Add this WebSocket configuration to your Spring Boot project:

```java
package com.TroisN.Service.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Enable simple broker for /topic and /queue destinations
        registry.enableSimpleBroker("/topic", "/queue");
        
        // Application destination prefix
        registry.setApplicationDestinationPrefixes("/app");
        
        // User destination prefix
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")  // For development - allows all origins
                // OR use specific origins for production:
                // .setAllowedOrigins("http://localhost:4200", "https://your-production-domain.com")
                .withSockJS();  // Enable SockJS fallback
    }
}
```

## Alternative: More Secure CORS Configuration (Recommended)

For production, use specific allowed origins:

```java
@Override
public void registerStompEndpoints(StompEndpointRegistry registry) {
    registry.addEndpoint("/ws")
            .setAllowedOrigins(
                "http://localhost:4200",           // Development
                "https://your-domain.com"          // Production
            )
            .setAllowedOriginPatterns("http://localhost:*")  // Allow any localhost port
            .withSockJS();
}
```

## Security Configuration (if using Spring Security)

If you're using Spring Security, you also need to allow WebSocket endpoints:

```java
package com.TroisN.Service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf().disable()  // Disable CSRF for WebSocket
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/ws/**").permitAll()  // Allow WebSocket endpoint
                .anyRequest().authenticated()
            );
        
        return http.build();
    }
}
```

## Dependencies Required

Make sure you have these dependencies in your `pom.xml`:

```xml
<!-- Spring WebSocket -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>

<!-- Spring Security (if used) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

## Testing the Configuration

1. **Stop your Spring Boot application**
2. **Add the WebSocketConfig class** to your project
3. **Restart your Spring Boot application**
4. **Check the console** - you should see:
   ```
   Mapped "{[/ws]}" onto ...
   ```

5. **Refresh your Angular app** - the CORS error should be gone

## Verifying WebSocket Connection

When properly configured, your browser console should show:

```
✅ [LAYOUT] Client loaded: client@example.com
STOMP: Web Socket Opened...
STOMP: >>> CONNECT
WebSocket Connected
Subscribed to /user/queue/notifications
```

## Common Issues

### Issue 1: Still getting CORS error
**Solution**: Make sure `setAllowedOriginPatterns("*")` or specific origins are set

### Issue 2: WebSocket connects but no messages received
**Solution**: Check that:
- Backend is using correct destination: `/user/queue/notifications`
- Username matches the client's email address
- NotificationMessage is properly serialized to JSON

### Issue 3: Authentication issues
**Solution**: If using Keycloak/JWT, make sure the token is sent with WebSocket connection

## Your Current Service is Correct

Your `WebSocketNotificationService` looks good:

```java
public void notifyClientByUsername(String username, NotificationMessage notification) {
    messagingTemplate.convertAndSendToUser(
            username,
            "/queue/notifications",
            notification
    );
}
```

This will send to: `/user/{username}/queue/notifications`

The frontend subscribes to: `/user/queue/notifications` (Spring automatically adds username)

## Next Steps

1. Create `WebSocketConfig.java` in your backend
2. Restart Spring Boot application
3. Refresh Angular app in browser
4. Test by creating an offer from admin panel
5. Client should receive notification instantly
