import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { KeycloakService } from 'keycloak-angular';
import { AuthService, AppContext } from './auth.service';
import { TokenResponse } from '../models/auth.models';
import { environment } from '../../../environments/environment';

describe('AuthService - Context Management', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  let keycloakService: jasmine.SpyObj<KeycloakService>;

  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();

    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);
    const keycloakSpy = jasmine.createSpyObj('KeycloakService', [
      'isLoggedIn',
      'login',
      'logout',
      'getUserRoles',
      'isUserInRole',
      'getKeycloakInstance'
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy },
        { provide: KeycloakService, useValue: keycloakSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    keycloakService = TestBed.inject(KeycloakService) as jasmine.SpyObj<KeycloakService>;
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  describe('Context Initialization', () => {
    it('should initialize with user context by default', () => {
      expect(service.getCurrentContext()).toBe('user');
    });

    it('should restore context from sessionStorage on initialization', () => {
      // Set context in storage before creating service
      sessionStorage.setItem('app_current_context', 'admin');

      // Create a new service instance
      const newService = new AuthService(keycloakService, router, TestBed.inject(HttpClientTestingModule) as any);

      expect(newService.getCurrentContext()).toBe('admin');
    });

    it('should default to user if storage contains invalid value', () => {
      sessionStorage.setItem('app_current_context', 'invalid');

      const newService = new AuthService(keycloakService, router, TestBed.inject(HttpClientTestingModule) as any);

      expect(newService.getCurrentContext()).toBe('user');
    });
  });

  describe('Context Switching', () => {
    it('should switch to admin context', () => {
      service.setContext('admin');
      expect(service.getCurrentContext()).toBe('admin');
    });

    it('should switch to user context', () => {
      service.setContext('admin');
      service.setContext('user');
      expect(service.getCurrentContext()).toBe('user');
    });

    it('should persist context in sessionStorage', () => {
      service.setContext('admin');
      expect(sessionStorage.getItem('app_current_context')).toBe('admin');
    });

    it('should emit context changes via observable', (done) => {
      let emissionCount = 0;
      const expectedValues: AppContext[] = ['user', 'admin', 'user'];

      service.context$.subscribe(context => {
        expect(context).toBe(expectedValues[emissionCount]);
        emissionCount++;

        if (emissionCount === expectedValues.length) {
          done();
        }
      });

      service.setContext('admin');
      service.setContext('user');
    });
  });

  describe('Login with Credentials', () => {
    it('should set admin context when logging in as admin', () => {
      const mockResponse: TokenResponse = {
        access_token: 'fake-token',
        refresh_token: 'fake-refresh',
        expires_in: 3600
      };

      service.loginWithCredentials(
        { emailAddress: 'admin@test.com', password: 'password' },
        'admin'
      ).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(mockResponse);

      expect(service.getCurrentContext()).toBe('admin');
    });

    it('should set user context when logging in as user', () => {
      const mockResponse: TokenResponse = {
        access_token: 'fake-token',
        refresh_token: 'fake-refresh',
        expires_in: 3600
      };

      service.loginWithCredentials(
        { emailAddress: 'user@test.com', password: 'password' },
        'user'
      ).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(mockResponse);

      expect(service.getCurrentContext()).toBe('user');
    });

    it('should store tokens with context prefix', () => {
      const mockResponse: TokenResponse = {
        access_token: 'admin-token',
        refresh_token: 'admin-refresh',
        expires_in: 3600
      };

      service.loginWithCredentials(
        { emailAddress: 'admin@test.com', password: 'password' },
        'admin'
      ).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(mockResponse);

      expect(sessionStorage.getItem('admin_access_token')).toBe('admin-token');
      expect(sessionStorage.getItem('admin_refresh_token')).toBe('admin-refresh');
    });
  });

  describe('Context Isolation', () => {
    it('should keep admin and user tokens separate', () => {
      // Login as admin
      const adminResponse: TokenResponse = {
        access_token: 'admin-token',
        refresh_token: 'admin-refresh',
        expires_in: 3600
      };

      service.loginWithCredentials(
        { emailAddress: 'admin@test.com', password: 'password' },
        'admin'
      ).subscribe();

      let req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(adminResponse);

      // Login as user
      const userResponse: TokenResponse = {
        access_token: 'user-token',
        refresh_token: 'user-refresh',
        expires_in: 3600
      };

      service.loginWithCredentials(
        { emailAddress: 'user@test.com', password: 'password' },
        'user'
      ).subscribe();

      req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(userResponse);

      // Both tokens should exist
      expect(sessionStorage.getItem('admin_access_token')).toBe('admin-token');
      expect(sessionStorage.getItem('user_access_token')).toBe('user-token');
    });

    it('should retrieve correct token based on context', () => {
      sessionStorage.setItem('admin_access_token', 'admin-token');
      sessionStorage.setItem('user_access_token', 'user-token');
      sessionStorage.setItem('admin_token_expiry', (Date.now() + 3600000).toString());
      sessionStorage.setItem('user_token_expiry', (Date.now() + 3600000).toString());

      service.setContext('admin');
      expect(service.getAuthToken()).toBe('admin-token');

      service.setContext('user');
      expect(service.getAuthToken()).toBe('user-token');
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      // Setup authenticated state
      sessionStorage.setItem('admin_access_token', 'admin-token');
      sessionStorage.setItem('user_access_token', 'user-token');
      service.setContext('admin');
    });

    it('should reset context to user on logout', () => {
      keycloakService.isLoggedIn.and.returnValue(false);

      service.logout();

      expect(service.getCurrentContext()).toBe('user');
    });

    it('should clear tokens for current context', () => {
      keycloakService.isLoggedIn.and.returnValue(false);

      service.logout();

      expect(sessionStorage.getItem('admin_access_token')).toBeNull();
    });

    it('should not affect other context tokens', () => {
      keycloakService.isLoggedIn.and.returnValue(false);

      service.logout();

      // User token should still exist
      expect(sessionStorage.getItem('user_access_token')).toBe('user-token');
    });
  });

  describe('Authentication Check', () => {
    it('should check authentication in specific context', () => {
      sessionStorage.setItem('admin_access_token', 'admin-token');
      sessionStorage.setItem('admin_token_expiry', (Date.now() + 3600000).toString());

      expect(service.isAuthenticated('admin')).toBe(true);
      expect(service.isAuthenticated('user')).toBe(false);
    });

    it('should use current context if no context provided', () => {
      sessionStorage.setItem('admin_access_token', 'admin-token');
      sessionStorage.setItem('admin_token_expiry', (Date.now() + 3600000).toString());
      service.setContext('admin');

      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('Context Helper Methods', () => {
    it('should correctly identify admin context', () => {
      service.setContext('admin');
      expect(service.isInAdminContext()).toBe(true);
      expect(service.isInUserContext()).toBe(false);
    });

    it('should correctly identify user context', () => {
      service.setContext('user');
      expect(service.isInUserContext()).toBe(true);
      expect(service.isInAdminContext()).toBe(false);
    });
  });

  describe('Deprecated Methods', () => {
    it('setLoginContext should call setContext', () => {
      spyOn(service, 'setContext');

      service.setLoginContext('admin');

      expect(service.setContext).toHaveBeenCalledWith('admin');
    });

    it('getLoginContext should return current context', () => {
      service.setContext('admin');

      expect(service.getLoginContext()).toBe('admin');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid context switches', () => {
      service.setContext('admin');
      service.setContext('user');
      service.setContext('admin');
      service.setContext('user');

      expect(service.getCurrentContext()).toBe('user');
      expect(sessionStorage.getItem('app_current_context')).toBe('user');
    });

    it('should handle clearLoginContext', () => {
      service.setContext('admin');
      service.clearLoginContext();

      // Should reset to user
      expect(service.getCurrentContext()).toBe('user');
    });
  });
});
