/*
  AIKYAM — Authentication Module (Supabase)
  - Client-side auth: sign in, sign up, sign out, password reset
  - Session management and header UI updates
  - Route protection with role-based access
*/

(function () {
  'use strict';

  /* ===================== CONFIG ===================== */
  // Credentials loaded from config.js (which is .gitignored)
  var config = window.AIKYAM_CONFIG || {};
  var SUPABASE_URL = config.SUPABASE_URL || '';
  var SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY || '';

  /* ===================== ROLES ===================== */
  var ROLES = {
    GlobalAdmin: 'GlobalAdmin',
    OrgAdmin: 'OrgAdmin',
    ContentManager: 'ContentManager',
    ProgramManager: 'ProgramManager',
    FinanceStaff: 'FinanceStaff',
    Volunteer: 'Volunteer',
    Donor: 'Donor',
    Support: 'Support',
    Member: 'Member'
  };

  // Role hierarchy: higher index = higher privilege
  var ROLE_HIERARCHY = [
    'Member', 'Donor', 'Support', 'Volunteer',
    'FinanceStaff', 'ProgramManager', 'ContentManager',
    'OrgAdmin', 'GlobalAdmin'
  ];

  function getRoleLevel(role) {
    var idx = ROLE_HIERARCHY.indexOf(role);
    return idx >= 0 ? idx : 0;
  }

  function hasMinRole(userRole, requiredRole) {
    return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
  }

  function isAdmin(role) {
    return role === ROLES.GlobalAdmin || role === ROLES.OrgAdmin;
  }

  function isStaff(role) {
    return [
      ROLES.GlobalAdmin, ROLES.OrgAdmin, ROLES.ContentManager,
      ROLES.ProgramManager, ROLES.FinanceStaff, ROLES.Support
    ].indexOf(role) !== -1;
  }

  /* ===================== CLIENT INIT ===================== */
  let supabaseClient = null;

  function getClient() {
    if (supabaseClient) return supabaseClient;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('AIKYAM Auth: Missing config. Copy config.example.js to config.js and add your Supabase credentials.');
      return null;
    }
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      console.warn('AIKYAM Auth: Supabase SDK not loaded');
      return null;
    }
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
  }

  /* ===================== SESSION ===================== */
  async function getSession() {
    const client = getClient();
    if (!client) return null;
    const { data: { session } } = await client.auth.getSession();
    return session;
  }

  async function getProfile() {
    const client = getClient();
    if (!client) return null;
    const session = await getSession();
    if (!session) return null;
    try {
      const { data, error } = await client
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', session.user.id)
        .single();
      if (error) {
        // profiles table may not exist yet — fall back to session metadata
        console.warn('AIKYAM Auth: Could not fetch profile, using session data.', error.message);
        return {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || '',
          role: ROLES.Member
        };
      }
      return data;
    } catch (err) {
      return {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || '',
        role: ROLES.Member
      };
    }
  }

  /* ===================== AUTH OPERATIONS ===================== */
  async function signIn(email, password) {
    const client = getClient();
    if (!client) return { error: { message: 'Auth service unavailable' } };
    return client.auth.signInWithPassword({ email, password });
  }

  async function signUp(email, password, fullName) {
    const client = getClient();
    if (!client) return { error: { message: 'Auth service unavailable' } };
    return client.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
  }

  async function signOut() {
    const client = getClient();
    if (!client) return;
    await client.auth.signOut();
    window.location.href = 'index.html';
  }

  async function resetPassword(email) {
    const client = getClient();
    if (!client) return { error: { message: 'Auth service unavailable' } };
    return client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password.html'
    });
  }

  async function updatePassword(newPassword) {
    const client = getClient();
    if (!client) return { error: { message: 'Auth service unavailable' } };
    return client.auth.updateUser({ password: newPassword });
  }

  /* ===================== HEADER UI ===================== */
  async function updateHeaderAuthState() {
    const slot = document.getElementById('nav-auth-slot');
    if (!slot) return;

    const session = await getSession();
    if (!session) {
      slot.innerHTML = '<a href="login.html" class="nav-login-btn">Login</a>';
      return;
    }

    var profile = await getProfile();
    var displayName = profile?.full_name || session.user.user_metadata?.full_name || session.user.email;
    var initial = (displayName || '?')[0].toUpperCase();
    var userRole = profile ? profile.role : ROLES.Member;
    var roleBadge = userRole !== ROLES.Member ? '<span class="nav-user__role">' + userRole + '</span>' : '';

    slot.innerHTML = `
      <div class="nav-user">
        <button class="nav-user__toggle" aria-label="Account menu" aria-expanded="false">${initial}</button>
        <div class="nav-user__dropdown" id="userDropdown">
          <span class="nav-user__name">${displayName}</span>
          ${roleBadge}
          <a href="#" class="nav-user__link" id="logoutBtn">Sign Out</a>
        </div>
      </div>
    `;

    const toggle = slot.querySelector('.nav-user__toggle');
    const dropdown = slot.querySelector('#userDropdown');
    const logoutBtn = slot.querySelector('#logoutBtn');

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      const open = dropdown.classList.toggle('show');
      toggle.setAttribute('aria-expanded', open);
    });

    document.addEventListener('click', function () {
      dropdown.classList.remove('show');
      toggle.setAttribute('aria-expanded', 'false');
    });

    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      signOut();
    });
  }

  /* ===================== ROUTE PROTECTION ===================== */
  // requireAuth('ContentManager') — user must have ContentManager role or higher
  // requireAuth() — any authenticated user (Member+)
  async function requireAuth(requiredRole) {
    requiredRole = requiredRole || ROLES.Member;
    var session = await getSession();
    if (!session) {
      window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    var profile = await getProfile();
    var userRole = profile ? profile.role : ROLES.Member;
    if (!hasMinRole(userRole, requiredRole)) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }

  /* ===================== CONDITIONAL UI ===================== */
  // Usage in HTML: <div data-auth-required="ContentManager" style="display:none;">
  // Shows element if user's role >= the required role in the hierarchy
  // Special values: "staff" (any staff role), "admin" (GlobalAdmin or OrgAdmin), "authenticated" (any logged-in user)
  async function applyAuthVisibility() {
    var session = await getSession();
    if (!session) return; // all auth-required elements stay hidden

    var profile = await getProfile();
    var userRole = profile ? profile.role : ROLES.Member;

    document.querySelectorAll('[data-auth-required]').forEach(function (el) {
      var required = el.getAttribute('data-auth-required');
      var show = false;

      if (required === 'authenticated') {
        show = true;
      } else if (required === 'admin') {
        show = isAdmin(userRole);
      } else if (required === 'staff') {
        show = isStaff(userRole);
      } else if (ROLE_HIERARCHY.indexOf(required) !== -1) {
        // Specific role: show if user's role >= required role
        show = hasMinRole(userRole, required);
      } else if (required === userRole) {
        // Exact role match
        show = true;
      }

      if (show) el.style.display = '';
    });
  }

  /* ===================== RATE LIMITING ===================== */
  var attempts = {};
  var MAX_ATTEMPTS = 5;
  var LOCKOUT_MS = 60000; // 1 minute lockout after max attempts

  function checkRateLimit(action) {
    var now = Date.now();
    if (!attempts[action]) attempts[action] = { count: 0, firstAttempt: now };

    var record = attempts[action];
    // Reset if lockout period has passed
    if (now - record.firstAttempt > LOCKOUT_MS) {
      record.count = 0;
      record.firstAttempt = now;
    }

    record.count++;
    if (record.count > MAX_ATTEMPTS) {
      var remaining = Math.ceil((LOCKOUT_MS - (now - record.firstAttempt)) / 1000);
      return { blocked: true, message: 'Too many attempts. Please wait ' + remaining + ' seconds.' };
    }
    return { blocked: false };
  }

  /* ===================== FORM HANDLERS ===================== */
  function initLoginForm() {
    var form = document.getElementById('loginForm');
    if (!form) return;

    var msg = document.getElementById('loginMessage');

    // Check for query params (confirmation, reset success)
    var params = new URLSearchParams(window.location.search);
    if (params.get('confirmed') === 'true') {
      showMessage(msg, 'Email confirmed! You can now sign in.', 'success');
    }
    if (params.get('reset') === 'true') {
      showMessage(msg, 'Password updated! Sign in with your new password.', 'success');
    }

    // If already logged in, redirect
    getSession().then(function (session) {
      if (session) {
        var redirect = params.get('redirect') || 'index.html';
        window.location.href = redirect;
      }
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = document.getElementById('email').value.trim();
      var password = document.getElementById('password').value;

      if (!email || !password) {
        showMessage(msg, 'Please enter your email and password.', 'error');
        return;
      }

      var limit = checkRateLimit('login');
      if (limit.blocked) {
        showMessage(msg, limit.message, 'error');
        return;
      }

      showMessage(msg, 'Signing in...', 'info');
      setSubmitLoading(form, true);

      var result = await signIn(email, password);

      if (result.error) {
        showMessage(msg, result.error.message, 'error');
        setSubmitLoading(form, false);
      } else {
        var redirect = params.get('redirect') || 'index.html';
        window.location.href = redirect;
      }
    });

    // Forgot password toggle
    var forgotLink = document.getElementById('forgotPasswordLink');
    var forgotPanel = document.getElementById('forgotPasswordPanel');
    if (forgotLink && forgotPanel) {
      forgotLink.addEventListener('click', function (e) {
        e.preventDefault();
        forgotPanel.classList.toggle('show');
      });
    }

    // Forgot password submit
    var forgotForm = document.getElementById('forgotPasswordForm');
    if (forgotForm) {
      forgotForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var email = document.getElementById('forgotEmail').value.trim();
        var forgotMsg = document.getElementById('forgotMessage');

        if (!email) {
          showMessage(forgotMsg, 'Please enter your email.', 'error');
          return;
        }

        var limit = checkRateLimit('forgot');
        if (limit.blocked) {
          showMessage(forgotMsg, limit.message, 'error');
          return;
        }

        showMessage(forgotMsg, 'Sending reset link...', 'info');

        var result = await resetPassword(email);

        if (result.error) {
          showMessage(forgotMsg, result.error.message, 'error');
        } else {
          showMessage(forgotMsg, 'Check your email for a password reset link.', 'success');
        }
      });
    }
  }

  function initSignupForm() {
    var form = document.getElementById('signupForm');
    if (!form) return;

    var msg = document.getElementById('signupMessage');

    // If already logged in, redirect
    getSession().then(function (session) {
      if (session) window.location.href = 'index.html';
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var fullName = document.getElementById('fullName').value.trim();
      var email = document.getElementById('signupEmail').value.trim();
      var password = document.getElementById('signupPassword').value;
      var confirmPassword = document.getElementById('confirmPassword').value;

      if (!fullName || !email || !password) {
        showMessage(msg, 'Please fill in all fields.', 'error');
        return;
      }
      if (password.length < 8) {
        showMessage(msg, 'Password must be at least 8 characters.', 'error');
        return;
      }
      if (password !== confirmPassword) {
        showMessage(msg, 'Passwords do not match.', 'error');
        return;
      }

      var limit = checkRateLimit('signup');
      if (limit.blocked) {
        showMessage(msg, limit.message, 'error');
        return;
      }

      showMessage(msg, 'Creating your account...', 'info');
      setSubmitLoading(form, true);

      var result = await signUp(email, password, fullName);

      if (result.error) {
        showMessage(msg, result.error.message, 'error');
        setSubmitLoading(form, false);
      } else {
        showMessage(msg, 'Account created! Check your email to confirm, then sign in.', 'success');
        form.reset();
        setSubmitLoading(form, false);
      }
    });
  }

  function initResetPasswordForm() {
    var form = document.getElementById('resetPasswordForm');
    if (!form) return;

    var msg = document.getElementById('resetMessage');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var password = document.getElementById('newPassword').value;
      var confirmPassword = document.getElementById('confirmNewPassword').value;

      if (!password) {
        showMessage(msg, 'Please enter a new password.', 'error');
        return;
      }
      if (password.length < 8) {
        showMessage(msg, 'Password must be at least 8 characters.', 'error');
        return;
      }
      if (password !== confirmPassword) {
        showMessage(msg, 'Passwords do not match.', 'error');
        return;
      }

      showMessage(msg, 'Updating your password...', 'info');
      setSubmitLoading(form, true);

      var result = await updatePassword(password);

      if (result.error) {
        showMessage(msg, result.error.message, 'error');
        setSubmitLoading(form, false);
      } else {
        showMessage(msg, 'Password updated! Redirecting to login...', 'success');
        setTimeout(function () {
          window.location.href = 'login.html?reset=true';
        }, 1500);
      }
    });
  }

  /* ===================== HELPERS ===================== */
  function showMessage(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = 'login-form__message login-form__message--' + type;
  }

  function setSubmitLoading(form, loading) {
    var btn = form.querySelector('[type="submit"]');
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = 'Please wait...';
    } else {
      btn.textContent = btn.dataset.originalText || btn.textContent;
    }
  }

  /* ===================== EMAIL CONFIRMATION HANDLING ===================== */
  function handleEmailConfirmation() {
    // Supabase redirects with hash fragments after email confirmation
    // e.g., /login.html#access_token=...&type=signup
    var hash = window.location.hash;
    if (!hash) return;

    var params = new URLSearchParams(hash.substring(1));
    var type = params.get('type');

    if (type === 'signup' || type === 'email') {
      // Email confirmed — clean up URL and show success message
      history.replaceState(null, '', window.location.pathname + '?confirmed=true');
      window.location.reload();
    } else if (type === 'recovery') {
      // Password reset — redirect to reset page with the token in the URL
      // Supabase SDK picks up the token automatically from the hash
      if (!window.location.pathname.includes('reset-password')) {
        window.location.href = 'reset-password.html' + hash;
      }
    }
  }

  /* ===================== PASSWORD VISIBILITY TOGGLE ===================== */
  function initPasswordToggles() {
    document.querySelectorAll('.login-form__input[type="password"]').forEach(function (input) {
      var wrapper = document.createElement('div');
      wrapper.className = 'login-form__password-wrap';

      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'login-form__password-toggle';
      toggle.setAttribute('aria-label', 'Show password');
      toggle.textContent = 'Show';

      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);
      wrapper.appendChild(toggle);

      toggle.addEventListener('click', function () {
        var isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        toggle.textContent = isPassword ? 'Hide' : 'Show';
        toggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      });
    });
  }

  /* ===================== INIT ===================== */
  function init() {
    var client = getClient();
    if (!client) return;

    // Handle email confirmation / password reset callbacks
    handleEmailConfirmation();

    // Listen for auth state changes (cross-tab sync)
    client.auth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        updateHeaderAuthState();
        applyAuthVisibility();
      }
    });

    // Initialize page-specific forms
    initLoginForm();
    initSignupForm();
    initResetPasswordForm();

    // Initialize password visibility toggles
    initPasswordToggles();

    // Apply conditional visibility
    applyAuthVisibility();
  }

  /* ===================== PUBLIC API ===================== */
  window.AIKYAM_Auth = {
    init: init,
    getClient: getClient,
    getSession: getSession,
    getProfile: getProfile,
    signIn: signIn,
    signUp: signUp,
    signOut: signOut,
    resetPassword: resetPassword,
    updatePassword: updatePassword,
    updateHeaderAuthState: updateHeaderAuthState,
    requireAuth: requireAuth,
    // Role utilities
    ROLES: ROLES,
    hasMinRole: hasMinRole,
    isAdmin: isAdmin,
    isStaff: isStaff
  };
})();
