// Componente de Autenticación para ClassPlanner
class AuthComponent {
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
        this.currentUser = null;
        this.isAuthenticated = false;
    }

    // Mostrar modal de autenticación
    showAuthModal() {
        const modal = document.createElement('div');
        modal.className = 'modal auth-modal';
        modal.innerHTML = `
            <div class="modal-content auth-modal-content">
                <div class="modal-header auth-modal-header">
                    <div class="modal-title">
                        <i class="fas fa-user-circle"></i>
                        <h3>Iniciar Sesión</h3>
                    </div>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body auth-modal-body">
                    <div class="auth-tabs">
                        <button class="auth-tab active" data-tab="signin">
                            <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
                        </button>
                        <button class="auth-tab" data-tab="signup">
                            <i class="fas fa-user-plus"></i> Registrarse
                        </button>
                    </div>
                    
                    <div class="auth-content">
                        <!-- Formulario de Inicio de Sesión -->
                        <div class="auth-form active" id="signin-form">
                            <div class="form-group">
                                <label for="signin-email">
                                    <i class="fas fa-envelope"></i> Email
                                </label>
                                <input type="email" id="signin-email" placeholder="tu@email.com" required>
                            </div>
                            <div class="form-group">
                                <label for="signin-password">
                                    <i class="fas fa-lock"></i> Contraseña
                                </label>
                                <input type="password" id="signin-password" placeholder="Tu contraseña" required>
                            </div>
                            <button class="btn-primary auth-submit" data-action="signin">
                                <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
                            </button>
                        </div>
                        
                        <!-- Formulario de Registro -->
                        <div class="auth-form" id="signup-form">
                            <div class="form-group">
                                <label for="signup-name">
                                    <i class="fas fa-user"></i> Nombre Completo
                                </label>
                                <input type="text" id="signup-name" placeholder="Tu nombre completo" required>
                            </div>
                            <div class="form-group">
                                <label for="signup-email">
                                    <i class="fas fa-envelope"></i> Email
                                </label>
                                <input type="email" id="signup-email" placeholder="tu@email.com" required>
                            </div>
                            <div class="form-group">
                                <label for="signup-password">
                                    <i class="fas fa-lock"></i> Contraseña
                                </label>
                                <input type="password" id="signup-password" placeholder="Mínimo 6 caracteres" required>
                            </div>
                            <div class="form-group">
                                <label for="signup-confirm">
                                    <i class="fas fa-lock"></i> Confirmar Contraseña
                                </label>
                                <input type="password" id="signup-confirm" placeholder="Repite tu contraseña" required>
                            </div>
                            <button class="btn-primary auth-submit" data-action="signup">
                                <i class="fas fa-user-plus"></i> Registrarse
                            </button>
                        </div>
                    </div>
                    
                    <div class="auth-status" id="auth-status"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.setupAuthModalEvents(modal);
    }

    setupAuthModalEvents(modal) {
        const closeModal = () => {
            document.body.removeChild(modal);
        };

        // Cerrar modal
        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Cambiar entre pestañas
        modal.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabType = e.target.dataset.tab;
                
                // Actualizar pestañas
                modal.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                // Actualizar formularios
                modal.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
                modal.querySelector(`#${tabType}-form`).classList.add('active');
            });
        });

        // Enviar formularios
        modal.querySelectorAll('.auth-submit').forEach(button => {
            button.addEventListener('click', async (e) => {
                const action = e.target.dataset.action;
                await this.handleAuthAction(action, modal);
            });
        });
    }

    async handleAuthAction(action, modal) {
        const statusDiv = modal.querySelector('#auth-status');
        const submitButton = modal.querySelector(`[data-action="${action}"]`);
        
        // Mostrar loading
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        submitButton.disabled = true;
        statusDiv.innerHTML = '';

        try {
            if (action === 'signin') {
                const email = modal.querySelector('#signin-email').value;
                const password = modal.querySelector('#signin-password').value;
                
                const result = await this.supabaseService.signIn(email, password);
                
                if (result.success) {
                    this.currentUser = result.data.user;
                    this.isAuthenticated = true;
                    statusDiv.innerHTML = '<div class="success-message"><i class="fas fa-check"></i> ¡Inicio de sesión exitoso!</div>';
                    
                    setTimeout(() => {
                        document.body.removeChild(modal);
                        this.onAuthSuccess();
                    }, 1500);
                } else {
                    statusDiv.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> ${result.error}</div>`;
                }
            } else if (action === 'signup') {
                const name = modal.querySelector('#signup-name').value;
                const email = modal.querySelector('#signup-email').value;
                const password = modal.querySelector('#signup-password').value;
                const confirm = modal.querySelector('#signup-confirm').value;
                
                if (password !== confirm) {
                    statusDiv.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Las contraseñas no coinciden</div>';
                    return;
                }
                
                if (password.length < 6) {
                    statusDiv.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> La contraseña debe tener al menos 6 caracteres</div>';
                    return;
                }
                
                const result = await this.supabaseService.signUp(email, password, name);
                
                if (result.success) {
                    statusDiv.innerHTML = '<div class="success-message"><i class="fas fa-check"></i> ¡Registro exitoso! Revisa tu email para confirmar tu cuenta.</div>';
                } else {
                    statusDiv.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> ${result.error}</div>`;
                }
            }
        } catch (error) {
            statusDiv.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Error: ${error.message}</div>`;
        } finally {
            // Restaurar botón
            if (action === 'signin') {
                submitButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
            } else {
                submitButton.innerHTML = '<i class="fas fa-user-plus"></i> Registrarse';
            }
            submitButton.disabled = false;
        }
    }

    // Mostrar información del usuario
    showUserInfo() {
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        userInfo.innerHTML = `
            <div class="user-avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="user-details">
                <div class="user-name">${this.currentUser?.user_metadata?.full_name || 'Usuario'}</div>
                <div class="user-email">${this.currentUser?.email}</div>
            </div>
            <div class="user-actions">
                <button class="btn-secondary sync-btn" id="syncBtn">
                    <i class="fas fa-sync"></i> Sincronizar
                </button>
                <button class="btn-secondary logout-btn" id="logoutBtn">
                    <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                </button>
            </div>
        `;

        // Insertar en el header
        const header = document.querySelector('.header');
        if (header) {
            header.appendChild(userInfo);
        }

        // Event listeners
        document.getElementById('syncBtn')?.addEventListener('click', () => {
            this.onSyncRequest();
        });

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });
    }

    async logout() {
        const result = await this.supabaseService.signOut();
        if (result.success) {
            this.currentUser = null;
            this.isAuthenticated = false;
            
            // Remover información del usuario
            const userInfo = document.querySelector('.user-info');
            if (userInfo) {
                userInfo.remove();
            }
            
            // Mostrar modal de autenticación
            this.showAuthModal();
        }
    }

    // Callbacks para eventos
    onAuthSuccess() {
        console.log('Usuario autenticado:', this.currentUser);
        this.showUserInfo();
        
        // Notificar al ClassPlanner que el usuario está autenticado
        if (window.classPlanner) {
            window.classPlanner.onUserAuthenticated(this.currentUser);
        }
    }

    onSyncRequest() {
        console.log('Solicitud de sincronización');
        
        // Notificar al ClassPlanner para sincronizar datos
        if (window.classPlanner) {
            window.classPlanner.syncWithSupabase();
        }
    }

    // Verificar si el usuario está autenticado
    async checkAuthStatus() {
        try {
            const { data: { user } } = await this.supabaseService.getCurrentUser();
            
            if (user) {
                this.currentUser = user;
                this.isAuthenticated = true;
                this.showUserInfo();
                return true;
            } else {
                this.showAuthModal();
                return false;
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            this.showAuthModal();
            return false;
        }
    }
}

// Exportar para uso global
window.AuthComponent = AuthComponent;



