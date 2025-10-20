// Sistema de Planeación de Clases - Versión Nueva y Funcional
class ClassPlanner {
    constructor() {
        this.classes = [];
        this.completedClasses = [];
        this.currentGrade = 'all';
        this.currentView = 'list';
        this.currentMonth = 7; // Agosto (0-indexed)
        this.currentYear = 2025;
        this.currentCycle = 1;
        this.isAnnualView = false;
        this.currentSchoolYear = '2025-2026';
        this.schoolYears = ['2025-2026'];
        this.nonSchoolDays = {}; // {schoolYear: [dates]}
        this.customCycleDays = {}; // {schoolYear: {date: cycleDay}}
        this.cycleStartDays = {}; // {schoolYear: startDay}
        this.cycleDates = {}; // {schoolYear: {cycleDay: date}}
        this.monthCycleConfig = {}; // {schoolYear: {month: firstCycleDay}}
        
        // Supabase
        this.supabaseService = null;
        this.authComponent = null;
        this.currentUser = null;
        this.currentSchoolYearId = null;
        this.isSupabaseEnabled = false;
        
        this.init();
    }

    init() {
        console.log('🚀 Inicializando ClassPlanner...');
        
        // Inicializar Supabase si está disponible
        this.initSupabase();
        
        this.loadFromStorage();
        this.updateSchoolYearSelector();
        this.updateCycleStartDaySelector();
        this.initializeCycleDates();
        this.setupEventListeners();
        this.updateGradeCounts();
        this.renderClasses();
        this.renderCompletedClasses();
        this.updateStats();
        this.setDefaultDate();
        this.renderCalendar();
        console.log('✅ ClassPlanner inicializado correctamente');
    }

    initSupabase() {
        try {
            // Verificar si Supabase está disponible
            if (typeof window.supabaseClient !== 'undefined' && window.SupabaseService && window.AuthComponent) {
                this.supabaseService = new window.SupabaseService();
                this.authComponent = new window.AuthComponent(this.supabaseService);
                this.isSupabaseEnabled = true;
                
                console.log('✅ Supabase inicializado correctamente');
                
                // Verificar estado de autenticación
                this.authComponent.checkAuthStatus().then(isAuthenticated => {
                    if (isAuthenticated) {
                        this.onUserAuthenticated(this.authComponent.currentUser);
                    }
                });
            } else {
                console.log('⚠️ Supabase no disponible, usando modo local');
                this.isSupabaseEnabled = false;
            }
        } catch (error) {
            console.error('❌ Error inicializando Supabase:', error);
            this.isSupabaseEnabled = false;
        }
    }

    setupEventListeners() {
        console.log('🔧 Configurando event listeners...');
        
        // Formulario principal
        document.getElementById('planForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addClass();
        });

        // Cambio de grado
        document.getElementById('grade').addEventListener('change', () => {
            this.updateHomeroomOptions();
        });

        // Botón para reactivar clases
        document.getElementById('reactivateClassesBtn').addEventListener('click', () => {
            this.reactivateCompletedClasses();
        });

        // Botón de calendario anual
        document.getElementById('annualCalendarBtn').addEventListener('click', () => {
            this.toggleAnnualCalendar();
        });

        // Navegación del calendario anual
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.changeMonth(-1);
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.changeMonth(1);
        });

        // Selector de ciclo
        document.getElementById('cycleSelect').addEventListener('change', () => {
            this.renderAnnualCalendar();
        });

        // Selector de día de inicio del ciclo
        document.getElementById('cycleStartDay').addEventListener('change', () => {
            this.updateCycleStartDay();
        });

        // Selector de año escolar
        document.getElementById('schoolYearSelect').addEventListener('change', () => {
            this.changeSchoolYear();
        });

        // Botón para agregar nuevo año escolar
        document.getElementById('addSchoolYearBtn').addEventListener('click', () => {
            this.showAddSchoolYearModal();
        });

        // Botón para gestionar días no lectivos
        document.getElementById('manageNonSchoolDaysBtn').addEventListener('click', () => {
            this.showNonSchoolDaysModal();
        });

        // Event listeners para fechas del ciclo
        document.querySelectorAll('.cycle-date-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const cycleDay = e.target.dataset.cycleDay;
                const date = e.target.value;
                this.updateCycleDate(cycleDay, date);
            });
        });

        // Event listeners para headers de días (click para editar)
        document.querySelectorAll('.day-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const cycleDay = e.currentTarget.dataset.cycleDay;
                this.showDateEditModal(cycleDay);
            });
        });

        // Event listener para configuración de mes
        document.getElementById('saveMonthConfig').addEventListener('click', () => {
            this.saveMonthCycleConfig();
        });

        // Event listener para cambio de mes
        document.getElementById('monthSelect').addEventListener('change', () => {
            this.updateMonthCyclePreview();
        });

        // Botones de navegación por grados
        document.querySelectorAll('.grade-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const grade = e.currentTarget.dataset.grade;
                this.switchToGrade(grade);
            });
        });

        // Filtros
        document.getElementById('filterLevel').addEventListener('change', () => {
            this.renderClasses();
        });

        document.getElementById('filterGroup').addEventListener('change', () => {
            this.renderClasses();
        });

        document.getElementById('filterPeriod').addEventListener('change', () => {
            this.renderClasses();
        });

        document.getElementById('filterCycleDay').addEventListener('change', () => {
            this.renderClasses();
        });

        // Botón limpiar filtros
        document.getElementById('clearFilters').addEventListener('click', () => {
            this.clearFilters();
        });

        // Botones de vista
        document.getElementById('listViewBtn').addEventListener('click', () => {
            console.log('📋 Cambiando a vista de lista');
            this.switchView('list');
        });

        document.getElementById('calendarViewBtn').addEventListener('click', () => {
            console.log('📅 Cambiando a vista de horario');
            this.switchView('calendar');
        });

        // Botón para asignar horario
        document.getElementById('addScheduleBtn').addEventListener('click', () => {
            this.showAddScheduleModal();
        });

        console.log('✅ Event listeners configurados');
    }

    addClass() {
        console.log('➕ Agregando nueva clase...');
        
        const grade = document.getElementById('grade').value;
        const subject = document.getElementById('subject').value;
        const topic = document.getElementById('topic').value.trim();
        const date = document.getElementById('date').value;
        const cycleDay = document.getElementById('cycleDay').value;
        const period = document.getElementById('period').value;
        const homeroom = document.getElementById('homeroom').value;
        const group = document.getElementById('group').value;
        const description = document.getElementById('description').value.trim();
        const notes = document.getElementById('notes').value.trim();

        console.log('📝 Datos capturados:', { grade, subject, topic, date, cycleDay, period, homeroom, group });

        // Validación básica
        if (!grade || !subject || !date || !cycleDay || !period || !homeroom) {
            alert('❌ Por favor completa todos los campos obligatorios');
            return;
        }

        // Combinar homeroom y grupo
        const finalGroup = group ? `${homeroom}-${group}` : homeroom;

        const newClass = {
            id: Date.now().toString(),
            grade: grade,
            subject: subject,
            topic: topic,
            date: date,
            cycleDay: cycleDay,
            period: period,
            group: finalGroup,
            description: description,
            notes: notes,
            completed: false,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        console.log('💾 Nueva clase creada:', newClass);

        this.classes.push(newClass);
        this.saveToStorage();
        this.updateGradeCounts();
        this.renderClasses();
        this.updateStats();
        this.clearForm();
        this.showNotification('✅ Planeación guardada exitosamente', 'success');
        
        console.log('✅ Clase agregada correctamente');
    }

    clearForm() {
        document.getElementById('planForm').reset();
        this.setDefaultDate();
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    updateHomeroomOptions() {
        const grade = document.getElementById('grade').value;
        const homeroomSelect = document.getElementById('homeroom');
        
        homeroomSelect.innerHTML = '<option value="">Seleccionar homeroom</option>';
        
        if (grade === '1' || grade === '2') {
            homeroomSelect.innerHTML += `
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
            `;
        } else if (grade === '3' || grade === '4' || grade === '5' || grade === '6') {
            homeroomSelect.innerHTML += `
                <option value="A">A</option>
                <option value="B">B</option>
            `;
        }
    }

    switchToGrade(grade) {
        console.log('🎯 Cambiando a grado:', grade);
        this.currentGrade = grade;
        this.updateViewTitle();
        this.renderClasses();
        
        // Actualizar botones de navegación
        document.querySelectorAll('.grade-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-grade="${grade}"]`).classList.add('active');
    }

    updateViewTitle() {
        const titleElement = document.getElementById('currentGradeTitle');
        const descriptionElement = document.getElementById('currentGradeDescription');
        
        if (this.currentGrade === 'all') {
            titleElement.innerHTML = '<i class="fas fa-list"></i> Todas las Clases';
            descriptionElement.textContent = 'Visualizando todas las planeaciones';
        } else {
            titleElement.innerHTML = `<i class="fas fa-graduation-cap"></i> Grado ${this.currentGrade}`;
            descriptionElement.textContent = `Visualizando planeaciones del grado ${this.currentGrade}`;
        }
    }

    updateGradeCounts() {
        const counts = {
            all: this.classes.length,
            1: this.classes.filter(cls => cls.grade === '1').length,
            2: this.classes.filter(cls => cls.grade === '2').length,
            3: this.classes.filter(cls => cls.grade === '3').length,
            4: this.classes.filter(cls => cls.grade === '4').length,
            5: this.classes.filter(cls => cls.grade === '5').length,
            6: this.classes.filter(cls => cls.grade === '6').length
        };

        Object.keys(counts).forEach(grade => {
            const countElement = document.getElementById(`count-${grade}`);
            if (countElement) {
                countElement.textContent = counts[grade];
            }
        });
    }

    renderClasses() {
        console.log('📋 Renderizando clases...');
        
        let filteredClasses = [...this.classes];
        
        // Filtrar por grado actual
        if (this.currentGrade !== 'all') {
            filteredClasses = filteredClasses.filter(cls => cls.grade === this.currentGrade);
        }
        
        // Aplicar filtros adicionales
        const filterLevel = document.getElementById('filterLevel').value;
        const filterGroup = document.getElementById('filterGroup').value;
        const filterPeriod = document.getElementById('filterPeriod').value;
        const filterCycleDay = document.getElementById('filterCycleDay').value;
        
        if (filterLevel) {
            filteredClasses = filteredClasses.filter(cls => cls.grade === filterLevel);
        }
        
        if (filterGroup) {
            filteredClasses = filteredClasses.filter(cls => cls.group === filterGroup);
        }
        
        if (filterPeriod) {
            filteredClasses = filteredClasses.filter(cls => cls.period === filterPeriod);
        }
        
        if (filterCycleDay) {
            filteredClasses = filteredClasses.filter(cls => cls.cycleDay === filterCycleDay);
        }
        
        // Ordenar por fecha y período
        filteredClasses.sort((a, b) => {
            if (a.cycleDay !== b.cycleDay) {
                return a.cycleDay - b.cycleDay;
            }
            return a.period.localeCompare(b.period);
        });
        
        const classesList = document.getElementById('classesList');
        
        if (filteredClasses.length === 0) {
            classesList.innerHTML = this.getEmptyStateHTML();
        } else {
            classesList.innerHTML = filteredClasses.map(cls => this.getClassHTML(cls)).join('');
            this.attachClassEventListeners();
        }
        
        console.log(`✅ ${filteredClasses.length} clases renderizadas`);
    }

    getClassHTML(cls) {
        const hasNotes = cls.notes && cls.notes.trim() !== '';
        const periodInfo = this.getPeriodInfo(cls.period);
        
        return `
            <div class="class-item ${cls.completed ? 'completed' : ''}" data-grade="${cls.grade}">
                <div class="class-header">
                    <div class="class-title">
                        <h3>${cls.grade}° Grado - Homeroom ${cls.group}</h3>
                        <span class="class-subject">${cls.subject}</span>
                    </div>
                    <div class="class-actions">
                        <label class="checkbox-container">
                            <input type="checkbox" id="check-${cls.id}" ${cls.completed ? 'checked' : ''}>
                            <span class="checkmark"></span>
                        </label>
                        <button class="edit-btn" data-id="${cls.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" data-id="${cls.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="class-details">
                    <div class="class-info">
                        <div class="info-item">
                            <i class="fas fa-calendar"></i>
                            <span>${this.formatDate(cls.date)}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-clock"></i>
                            <span>${periodInfo}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>Día ${cls.cycleDay}</span>
                        </div>
                    </div>
                    
                    ${cls.topic ? `
                        <div class="class-topic">
                            <strong>Tema:</strong> ${cls.topic}
                        </div>
                    ` : ''}
                    
                    ${cls.description ? `
                        <div class="class-description">
                            <strong>Descripción:</strong> ${cls.description}
                        </div>
                    ` : ''}
                    
                    ${hasNotes ? `
                        <div class="notes-indicator">
                            <i class="fas fa-sticky-note"></i>
                            <span>Notas disponibles</span>
                        </div>
                        <div class="class-notes">
                            <div class="notes-header">
                                <i class="fas fa-sticky-note"></i>
                                <span>Notas de progreso</span>
                            </div>
                            <div class="notes-content">${cls.notes}</div>
                            <button class="edit-notes-btn" data-id="${cls.id}">
                                <i class="fas fa-edit"></i> Editar Notas
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getEmptyStateHTML() {
        if (this.currentGrade === 'all') {
            return `
                <div class="empty-state">
                    <i class="fas fa-chalkboard"></i>
                    <h3>No hay clases registradas</h3>
                    <p>Agrega tu primera planeación usando el formulario de la izquierda</p>
                </div>
            `;
        } else {
            return `
                <div class="empty-state">
                    <i class="fas fa-graduation-cap"></i>
                    <h3>No hay clases para el grado ${this.currentGrade}</h3>
                    <p>Agrega una nueva planeación para este grado</p>
                </div>
            `;
        }
    }

    attachClassEventListeners() {
        // Checkboxes
        document.querySelectorAll('.class-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const classId = e.target.id.replace('check-', '');
                this.toggleClassCompletion(classId);
            });
        });

        // Botones de eliminar
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const classId = e.target.closest('.delete-btn').dataset.id;
                this.deleteClass(classId);
            });
        });

        // Botones de editar
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const classId = e.target.closest('.edit-btn').dataset.id;
                this.editClass(classId);
            });
        });

        // Botones de editar notas
        document.querySelectorAll('.edit-notes-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const classId = e.target.closest('.edit-notes-btn').dataset.id;
                this.editNotes(classId);
            });
        });
    }

    toggleClassCompletion(classId) {
        const classIndex = this.classes.findIndex(cls => cls.id === classId);
        if (classIndex !== -1) {
            this.classes[classIndex].completed = !this.classes[classIndex].completed;
            
            if (this.classes[classIndex].completed) {
                // Mover a clases finalizadas
                this.completedClasses.push(this.classes[classIndex]);
                this.classes.splice(classIndex, 1);
                this.showNotification('✅ Clase finalizada y archivada', 'success');
            } else {
                // Mover de vuelta a clases activas
                const completedIndex = this.completedClasses.findIndex(cls => cls.id === classId);
                if (completedIndex !== -1) {
                    this.completedClasses[completedIndex].completed = false;
                    this.classes.push(this.completedClasses[completedIndex]);
                    this.completedClasses.splice(completedIndex, 1);
                    this.showNotification('🔄 Clase reactivada', 'info');
                }
            }
            
            this.saveToStorage();
            this.updateGradeCounts();
            this.renderClasses();
            this.renderCompletedClasses();
            this.updateStats();
        }
    }

    editClass(classId) {
        const classIndex = this.classes.findIndex(cls => cls.id === classId);
        if (classIndex === -1) return;

        const cls = this.classes[classIndex];
        
        // Pre-llenar el formulario con los datos existentes
        document.getElementById('grade').value = cls.grade;
        document.getElementById('homeroom').value = cls.group.split('-')[0];
        if (cls.group.includes('-')) {
            document.getElementById('group').value = cls.group.split('-')[1];
        }
        document.getElementById('topic').value = cls.topic || '';
        document.getElementById('description').value = cls.description || '';
        document.getElementById('date').value = cls.date;
        document.getElementById('cycleDay').value = cls.cycleDay;
        document.getElementById('period').value = cls.period;
        document.getElementById('notes').value = cls.notes || '';
        
        // Cambiar el botón del formulario
        const submitBtn = document.querySelector('#planForm button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Planeación';
        submitBtn.onclick = (e) => {
            e.preventDefault();
            this.updateClass(classId);
        };
        
        // Scroll al formulario
        document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
        
        this.showNotification('📝 Modo edición activado', 'info');
    }

    updateClass(classId) {
        const classIndex = this.classes.findIndex(cls => cls.id === classId);
        if (classIndex === -1) return;

        const grade = document.getElementById('grade').value;
        const subject = document.getElementById('subject').value;
        const topic = document.getElementById('topic').value.trim();
        const date = document.getElementById('date').value;
        const cycleDay = document.getElementById('cycleDay').value;
        const period = document.getElementById('period').value;
        const homeroom = document.getElementById('homeroom').value;
        const group = document.getElementById('group').value;
        const description = document.getElementById('description').value.trim();
        const notes = document.getElementById('notes').value.trim();

        if (!grade || !subject || !date || !cycleDay || !period || !homeroom) {
            alert('❌ Por favor completa todos los campos obligatorios');
            return;
        }

        const finalGroup = group ? `${homeroom}-${group}` : homeroom;

        // Actualizar la clase
        this.classes[classIndex] = {
            ...this.classes[classIndex],
            grade: grade,
            subject: subject,
            topic: topic,
            date: date,
            cycleDay: cycleDay,
            period: period,
            group: finalGroup,
            description: description,
            notes: notes,
            lastUpdated: new Date().toISOString()
        };

        this.saveToStorage();
        this.updateGradeCounts();
        this.renderClasses();
        this.updateStats();
        this.clearForm();
        
        // Restaurar el botón original
        const submitBtn = document.querySelector('#planForm button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Agregar Planeación';
        submitBtn.onclick = null;
        
        this.showNotification('✅ Planeación actualizada exitosamente', 'success');
    }

    renderCompletedClasses() {
        const completedList = document.getElementById('completedClassesList');
        const reactivateBtn = document.getElementById('reactivateClassesBtn');
        
        if (this.completedClasses.length === 0) {
            completedList.innerHTML = `
                <div class="empty-completed">
                    <i class="fas fa-check-circle"></i>
                    <p>No hay clases finalizadas</p>
                </div>
            `;
            reactivateBtn.style.display = 'none';
        } else {
            completedList.innerHTML = this.completedClasses.map(cls => `
                <div class="completed-class-item" data-grade="${cls.grade}">
                    <div class="completed-class-info">
                        <h4>${cls.grade}° - Homeroom ${cls.group}</h4>
                        <p>${cls.topic || 'Sin tema'}</p>
                        <small>Finalizada: ${this.formatDate(cls.lastUpdated)}</small>
                    </div>
                </div>
            `).join('');
            reactivateBtn.style.display = 'block';
        }
    }

    reactivateCompletedClasses() {
        if (confirm('¿Estás seguro de que quieres reactivar todas las clases finalizadas para el nuevo año?')) {
            this.completedClasses.forEach(cls => {
                cls.completed = false;
                cls.lastUpdated = new Date().toISOString();
                this.classes.push(cls);
            });
            
            this.completedClasses = [];
            this.saveToStorage();
            this.updateGradeCounts();
            this.renderClasses();
            this.renderCompletedClasses();
            this.updateStats();
            
            this.showNotification('🔄 Todas las clases han sido reactivadas para el nuevo año', 'success');
        }
    }

    editNotes(classId) {
        const classIndex = this.classes.findIndex(cls => cls.id === classId);
        if (classIndex === -1) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Editar Notas</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <textarea id="modalNotes" rows="6" placeholder="Escribe tus notas aquí...">${this.classes[classIndex].notes || ''}</textarea>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary cancel-notes">Cancelar</button>
                    <button class="btn-primary save-notes">Guardar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.querySelector('.cancel-notes').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        modal.querySelector('.save-notes').addEventListener('click', () => {
            const newNotes = modal.querySelector('#modalNotes').value.trim();
            this.classes[classIndex].notes = newNotes;
            this.classes[classIndex].lastUpdated = new Date().toISOString();
            this.saveToStorage();
            this.renderClasses();
            this.showNotification('Notas actualizadas', 'success');
            closeModal();
        });
    }

    updateStats() {
        const totalClasses = this.classes.length;
        const completedClasses = this.classes.filter(cls => cls.completed).length;
        const pendingClasses = totalClasses - completedClasses;

        document.getElementById('totalClasses').textContent = totalClasses;
        document.getElementById('completedClasses').textContent = completedClasses;
        document.getElementById('pendingClasses').textContent = pendingClasses;
    }

    clearFilters() {
        document.getElementById('filterLevel').value = '';
        document.getElementById('filterGroup').value = '';
        document.getElementById('filterPeriod').value = '';
        document.getElementById('filterCycleDay').value = '';
        this.renderClasses();
    }

    getPeriodInfo(period) {
        const periods = {
            'P1': 'P1 (7:55 AM - 8:50 AM)',
            'P2': 'P2 (9:20 AM - 10:15 AM)',
            'P3': 'P3 (10:20 AM - 11:15 AM)',
            'P4': 'P4 (11:20 AM - 12:15 PM)',
            'P5': 'P5 (1:00 PM - 1:55 PM)',
            'P6': 'P6 (2:00 PM - 2:50 PM)'
        };
        return periods[period] || period;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return date.toLocaleDateString('es-ES', options);
    }

    switchView(view) {
        console.log(`🔄 Cambiando a vista: ${view}`);
        this.currentView = view;
        
        // Actualizar botones
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${view}ViewBtn`).classList.add('active');
        
        // Mostrar/ocultar vistas
        if (view === 'list') {
            document.getElementById('classesList').style.display = 'block';
            document.getElementById('calendarView').style.display = 'none';
            this.renderClasses();
        } else {
            document.getElementById('classesList').style.display = 'none';
            document.getElementById('calendarView').style.display = 'block';
            this.renderCalendar();
        }
        
        console.log(`✅ Vista cambiada a: ${view}`);
    }

    renderCalendar() {
        console.log('📅 Renderizando calendario...');
        
        const scheduleBody = document.getElementById('scheduleBody');
        const periods = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
        const days = ['1', '2', '3', '4', '5', '6'];
        
        scheduleBody.innerHTML = '';
        
        periods.forEach(period => {
            // Celda del período
            const periodCell = document.createElement('div');
            periodCell.className = 'schedule-cell period-cell';
            periodCell.innerHTML = `
                <div style="font-weight: 600; color: #4a5568;">${period}</div>
                <div style="font-size: 0.8rem; color: #718096;">${this.getPeriodInfo(period)}</div>
            `;
            scheduleBody.appendChild(periodCell);
            
            // Celdas de cada día
            days.forEach(day => {
                const cell = document.createElement('div');
                cell.className = 'schedule-cell';
                cell.dataset.period = period;
                cell.dataset.day = day;
                
                const cycleDate = this.cycleDates[this.currentSchoolYear]?.[day];
                const classesInSlot = this.classes.filter(cls => 
                    cls.period === period && 
                    cls.cycleDay === day &&
                    (cycleDate ? cls.date === cycleDate : true)
                );
                
                if (classesInSlot.length === 0) {
                    cell.classList.add('empty');
                    cell.innerHTML = '<span>Disponible</span>';
                    cell.addEventListener('click', () => {
                        this.showAddScheduleModal(period, day);
                    });
                } else {
                    cell.classList.add('occupied');
                    cell.innerHTML = classesInSlot.map(cls => `
                        <div class="schedule-item" data-grade="${cls.grade}">
                            <div class="schedule-item-header">${cls.grade}° ${cls.group}</div>
                            <div class="schedule-item-details">
                                ${cls.subject}<br>
                                ${cls.topic || 'Sin tema definido'}
                            </div>
                            <div class="schedule-item-actions">
                                <button class="schedule-item-btn" onclick="classPlanner.editScheduleItem('${cls.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="schedule-item-btn delete" onclick="classPlanner.deleteScheduleItem('${cls.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('');
                }
                
                scheduleBody.appendChild(cell);
            });
        });
        
        console.log('✅ Calendario renderizado');
    }

    showAddScheduleModal(period = null, day = null) {
        console.log('➕ Mostrando modal para agregar horario...');
        
        const modal = document.createElement('div');
        modal.className = 'modal schedule-modal';
        modal.innerHTML = `
            <div class="modal-content schedule-modal-content">
                <div class="modal-header schedule-modal-header">
                    <div class="modal-title">
                        <i class="fas fa-calendar-plus"></i>
                        <h3>Asignar Horario</h3>
                    </div>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body schedule-modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="modalGrade">
                                <i class="fas fa-graduation-cap"></i>
                                Grado
                            </label>
                            <select id="modalGrade" required>
                                <option value="">Seleccionar grado</option>
                                <option value="1">1°</option>
                                <option value="2">2°</option>
                                <option value="3">3°</option>
                                <option value="4">4°</option>
                                <option value="5">5°</option>
                                <option value="6">6°</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="modalHomeroom">
                                <i class="fas fa-home"></i>
                                Homeroom
                            </label>
                            <select id="modalHomeroom" required>
                                <option value="">Seleccionar homeroom</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="modalGroup">
                                <i class="fas fa-users"></i>
                                Grupo
                            </label>
                            <select id="modalGroup">
                                <option value="">Seleccionar grupo (opcional)</option>
                                <option value="1">1</option>
                                <option value="2">2</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="modalSubject">
                                <i class="fas fa-book"></i>
                                Materia
                            </label>
                            <input type="text" id="modalSubject" value="Tecnología" readonly class="readonly-input">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="modalCycleDay">
                                <i class="fas fa-calendar-alt"></i>
                                Día del ciclo
                            </label>
                            <select id="modalCycleDay" required>
                                <option value="">Seleccionar día</option>
                                <option value="1">Día 1</option>
                                <option value="2">Día 2</option>
                                <option value="3">Día 3</option>
                                <option value="4">Día 4</option>
                                <option value="5">Día 5</option>
                                <option value="6">Día 6</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="modalPeriod">
                                <i class="fas fa-clock"></i>
                                Período
                            </label>
                            <select id="modalPeriod" required>
                                <option value="">Seleccionar período</option>
                                <option value="P1">P1 (7:55 AM - 8:50 AM)</option>
                                <option value="P2">P2 (9:20 AM - 10:15 AM)</option>
                                <option value="P3">P3 (10:20 AM - 11:15 AM)</option>
                                <option value="P4">P4 (11:20 AM - 12:15 PM)</option>
                                <option value="P5">P5 (1:00 PM - 1:55 PM)</option>
                                <option value="P6">P6 (2:00 PM - 2:50 PM)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="modalTopic">
                            <i class="fas fa-lightbulb"></i>
                            Tema
                        </label>
                        <input type="text" id="modalTopic" placeholder="Ej: Fracciones (opcional)">
                    </div>
                    
                    <div class="form-group">
                        <label for="modalDescription">
                            <i class="fas fa-align-left"></i>
                            Descripción
                        </label>
                        <textarea id="modalDescription" placeholder="Descripción de la clase..." rows="3"></textarea>
                    </div>
                </div>
                <div class="modal-footer schedule-modal-footer">
                    <button class="btn-secondary cancel-modal">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="btn-primary save-modal">
                        <i class="fas fa-save"></i> Guardar Horario
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Pre-llenar campos si se proporcionan
        if (period) {
            modal.querySelector('#modalPeriod').value = period;
        }
        if (day) {
            modal.querySelector('#modalCycleDay').value = day;
        }

        // Actualizar opciones de homeroom cuando cambie el grado
        modal.querySelector('#modalGrade').addEventListener('change', () => {
            this.updateModalHomeroomOptions();
        });

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.querySelector('.cancel-modal').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        modal.querySelector('.save-modal').addEventListener('click', () => {
            this.saveScheduleFromModal();
            closeModal();
        });
    }

    updateModalHomeroomOptions() {
        const grade = document.getElementById('modalGrade').value;
        const homeroomSelect = document.getElementById('modalHomeroom');
        
        homeroomSelect.innerHTML = '<option value="">Seleccionar homeroom</option>';
        
        if (grade === '1' || grade === '2') {
            homeroomSelect.innerHTML += `
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
            `;
        } else if (grade === '3' || grade === '4' || grade === '5' || grade === '6') {
            homeroomSelect.innerHTML += `
                <option value="A">A</option>
                <option value="B">B</option>
            `;
        }
    }

    saveScheduleFromModal() {
        const grade = document.getElementById('modalGrade').value;
        const subject = document.getElementById('modalSubject').value;
        const homeroom = document.getElementById('modalHomeroom').value;
        const group = document.getElementById('modalGroup').value;
        const cycleDay = document.getElementById('modalCycleDay').value;
        const period = document.getElementById('modalPeriod').value;
        const topic = document.getElementById('modalTopic').value.trim();
        const description = document.getElementById('modalDescription').value.trim();

        if (!grade || !subject || !homeroom || !cycleDay || !period) {
            alert('❌ Por favor completa todos los campos obligatorios');
            return;
        }

        // Combinar homeroom y grupo
        const finalGroup = group ? `${homeroom}-${group}` : homeroom;
        
        // Obtener la fecha del ciclo
        const cycleDate = this.cycleDates[this.currentSchoolYear]?.[cycleDay.toString()];

        // Verificar si ya existe una clase en el mismo período y día
        const existingClass = this.classes.find(cls => 
            cls.period === period && 
            cls.cycleDay === cycleDay && 
            cls.grade === grade && 
            cls.group === finalGroup &&
            (cycleDate ? cls.date === cycleDate : true)
        );

        if (existingClass) {
            alert('⚠️ Ya existe una clase programada para este período, día y grupo');
            return;
        }

        const newClass = {
            id: Date.now().toString(),
            grade: grade,
            subject: subject,
            topic: topic,
            date: cycleDate || new Date().toISOString().split('T')[0],
            cycleDay: cycleDay,
            period: period,
            group: finalGroup,
            description: description,
            notes: '',
            completed: false,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        this.classes.push(newClass);
        this.saveToStorage();
        this.updateGradeCounts();
        this.renderClasses();
        this.renderCalendar();
        this.updateStats();
        this.showNotification('✅ Horario asignado exitosamente', 'success');
    }

    editScheduleItem(classId) {
        const classIndex = this.classes.findIndex(cls => cls.id === classId);
        if (classIndex === -1) return;

        const cls = this.classes[classIndex];
        this.showAddScheduleModal(cls.period, cls.cycleDay);
        
        // Pre-llenar con datos existentes
        setTimeout(() => {
            document.getElementById('modalGrade').value = cls.grade;
            document.getElementById('modalGroup').value = cls.group.split('-')[0];
            if (cls.group.includes('-')) {
                document.getElementById('modalGroup2').value = cls.group.split('-')[1];
            }
            document.getElementById('modalTopic').value = cls.topic || '';
            document.getElementById('modalDescription').value = cls.description || '';
        }, 100);
    }

    deleteScheduleItem(classId) {
        if (confirm('¿Estás seguro de que quieres eliminar esta clase del horario?')) {
            this.classes = this.classes.filter(cls => cls.id !== classId);
            this.saveToStorage();
            this.updateGradeCounts();
            this.renderCalendar();
            this.updateStats();
            this.showNotification('Clase eliminada del horario', 'success');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Persistencia local
    saveToStorage() {
        console.log('💾 Guardando en localStorage...', this.classes.length, 'clases activas,', this.completedClasses.length, 'finalizadas');
        localStorage.setItem('classPlanner_classes', JSON.stringify(this.classes));
        localStorage.setItem('classPlanner_completed', JSON.stringify(this.completedClasses));
        localStorage.setItem('classPlanner_schoolYears', JSON.stringify(this.schoolYears));
        localStorage.setItem('classPlanner_currentSchoolYear', this.currentSchoolYear);
        localStorage.setItem('classPlanner_nonSchoolDays', JSON.stringify(this.nonSchoolDays));
        localStorage.setItem('classPlanner_customCycleDays', JSON.stringify(this.customCycleDays));
        localStorage.setItem('classPlanner_cycleStartDays', JSON.stringify(this.cycleStartDays));
        localStorage.setItem('classPlanner_cycleDates', JSON.stringify(this.cycleDates));
        localStorage.setItem('classPlanner_monthCycleConfig', JSON.stringify(this.monthCycleConfig));
        console.log('✅ Guardado completado');
    }

    loadFromStorage() {
        console.log('📂 Cargando desde localStorage...');
        const stored = localStorage.getItem('classPlanner_classes');
        const storedCompleted = localStorage.getItem('classPlanner_completed');
        const storedSchoolYears = localStorage.getItem('classPlanner_schoolYears');
        const storedCurrentSchoolYear = localStorage.getItem('classPlanner_currentSchoolYear');
        const storedNonSchoolDays = localStorage.getItem('classPlanner_nonSchoolDays');
        const storedCustomCycleDays = localStorage.getItem('classPlanner_customCycleDays');
        const storedCycleStartDays = localStorage.getItem('classPlanner_cycleStartDays');
        const storedCycleDates = localStorage.getItem('classPlanner_cycleDates');
        const storedMonthCycleConfig = localStorage.getItem('classPlanner_monthCycleConfig');
        
        this.classes = stored ? JSON.parse(stored) : [];
        this.completedClasses = storedCompleted ? JSON.parse(storedCompleted) : [];
        this.schoolYears = storedSchoolYears ? JSON.parse(storedSchoolYears) : ['2025-2026'];
        this.currentSchoolYear = storedCurrentSchoolYear || '2025-2026';
        this.nonSchoolDays = storedNonSchoolDays ? JSON.parse(storedNonSchoolDays) : {};
        this.customCycleDays = storedCustomCycleDays ? JSON.parse(storedCustomCycleDays) : {};
        this.cycleStartDays = storedCycleStartDays ? JSON.parse(storedCycleStartDays) : {};
        this.cycleDates = storedCycleDates ? JSON.parse(storedCycleDates) : {};
        this.monthCycleConfig = storedMonthCycleConfig ? JSON.parse(storedMonthCycleConfig) : {};
        
        console.log('✅ Clases cargadas:', this.classes.length, 'activas,', this.completedClasses.length, 'finalizadas');
        console.log('✅ Años escolares:', this.schoolYears.length);
    }

    // Métodos del calendario anual
    toggleAnnualCalendar() {
        this.isAnnualView = !this.isAnnualView;
        const cyclesView = document.getElementById('cyclesView');
        const annualView = document.getElementById('annualView');
        const annualBtn = document.getElementById('annualCalendarBtn');
        
        if (this.isAnnualView) {
            cyclesView.style.display = 'none';
            annualView.style.display = 'block';
            annualBtn.innerHTML = '<i class="fas fa-calendar-week"></i> Vista de Ciclos';
            this.renderAnnualCalendar();
        } else {
            cyclesView.style.display = 'block';
            annualView.style.display = 'none';
            annualBtn.innerHTML = '<i class="fas fa-calendar"></i> Calendario Anual';
            this.renderCalendar();
        }
    }

    changeMonth(direction) {
        this.currentMonth += direction;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        } else if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.updateMonthDisplay();
        this.renderAnnualCalendar();
    }

    updateMonthDisplay() {
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        document.getElementById('currentMonth').textContent = 
            `${monthNames[this.currentMonth]} ${this.currentYear}`;
    }

    renderAnnualCalendar() {
        const calendarDays = document.getElementById('calendarDays');
        const cycle = parseInt(document.getElementById('cycleSelect').value);
        
        // Obtener el primer día del mes y cuántos días tiene
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Lunes = 0
        
        calendarDays.innerHTML = '';
        
        // Calcular cuántos días de lunes a viernes necesitamos mostrar
        const totalDays = daysInMonth;
        const weeks = Math.ceil(totalDays / 7);
        const totalWeekdays = weeks * 5; // Solo lunes a viernes
        
        // Días del mes anterior (solo lunes a viernes)
        const prevMonth = new Date(this.currentYear, this.currentMonth - 1, 0);
        let prevMonthDays = [];
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const day = prevMonth.getDate() - i;
            const date = new Date(this.currentYear, this.currentMonth - 1, day);
            const dayOfWeek = date.getDay();
            // Solo agregar si es lunes a viernes (1-5)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                prevMonthDays.push(day);
            }
        }
        
        // Mostrar días del mes anterior
        prevMonthDays.forEach(day => {
            const dayElement = this.createCalendarDay(day, true, cycle);
            calendarDays.appendChild(dayElement);
        });
        
        // Días del mes actual (solo lunes a viernes)
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.currentYear, this.currentMonth, day);
            const dayOfWeek = date.getDay();
            // Solo mostrar si es lunes a viernes (1-5)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                const dayElement = this.createCalendarDay(day, false, cycle);
                calendarDays.appendChild(dayElement);
            }
        }
        
        // Días del mes siguiente (solo lunes a viernes)
        const nextMonth = new Date(this.currentYear, this.currentMonth + 1, 1);
        let nextMonthDays = [];
        let day = 1;
        while (nextMonthDays.length < 5) { // Completar hasta tener 5 días de la semana siguiente
            const date = new Date(this.currentYear, this.currentMonth + 1, day);
            const dayOfWeek = date.getDay();
            // Solo agregar si es lunes a viernes (1-5)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                nextMonthDays.push(day);
            }
            day++;
        }
        
        // Mostrar días del mes siguiente
        nextMonthDays.forEach(day => {
            const dayElement = this.createCalendarDay(day, true, cycle);
            calendarDays.appendChild(dayElement);
        });
    }

    createCalendarDay(dayNumber, isOtherMonth, cycle) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        }
        
        // Crear fecha completa
        const date = new Date(this.currentYear, this.currentMonth, dayNumber);
        const dateStr = date.toISOString().split('T')[0];
        
        // Verificar si es hoy
        const today = new Date();
        if (!isOtherMonth && 
            dayNumber === today.getDate() && 
            this.currentMonth === today.getMonth() && 
            this.currentYear === today.getFullYear()) {
            dayElement.classList.add('today');
        }
        
        // Verificar si es fin de semana
        if (this.isWeekend(dateStr)) {
            dayElement.classList.add('weekend');
        }
        
        // Verificar si es día no lectivo
        if (this.isNonSchoolDay(dateStr)) {
            dayElement.classList.add('non-school-day');
        }
        
        // Calcular el día del ciclo usando la nueva lógica
        const cycleDay = this.getCycleDayForDate(dateStr);
        
        // Buscar clases para este día y ciclo
        const dayClasses = this.classes.filter(cls => 
            cls.cycleDay === cycleDay.toString() && 
            this.isClassInCycle(cls, cycle)
        );
        
        if (dayClasses.length > 0) {
            dayElement.classList.add('has-classes');
        }
        
        // Solo permitir edición en días lectivos
        if (!this.isWeekend(dateStr) && !this.isNonSchoolDay(dateStr)) {
            dayElement.classList.add('editable-cycle');
        }
        
        // Formatear la fecha para mostrar
        const dayOfWeek = date.getDay();
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        dayElement.innerHTML = `
            <div class="day-date">${dayNumber} ${monthNames[date.getMonth()]}</div>
            <div class="day-cycle">Día ${cycleDay}</div>
            <div class="day-classes">
                ${dayClasses.map(cls => `
                    <div class="day-class-item" data-grade="${cls.grade}">
                        ${cls.grade}° ${cls.group}
                    </div>
                `).join('')}
            </div>
        `;
        
        // Event listener para click en el día (solo días lectivos)
        if (!this.isWeekend(dateStr) && !this.isNonSchoolDay(dateStr)) {
            dayElement.addEventListener('click', () => {
                this.showDayScheduleModal(dayNumber, cycleDay, cycle);
            });
        }
        
        return dayElement;
    }

    isClassInCycle(cls, cycle) {
        // Lógica para determinar si una clase pertenece a un ciclo específico
        // Por ahora, todas las clases pertenecen al ciclo actual
        return true;
    }

    showDayScheduleModal(dayNumber, cycleDay, cycle) {
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        const modal = document.createElement('div');
        modal.className = 'modal schedule-modal';
        modal.innerHTML = `
            <div class="modal-content schedule-modal-content">
                <div class="modal-header schedule-modal-header">
                    <div class="modal-title">
                        <i class="fas fa-calendar-day"></i>
                        <h3>${dayNumber} de ${monthNames[this.currentMonth]} - Día ${cycleDay}</h3>
                    </div>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body schedule-modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="modalGrade">
                                <i class="fas fa-graduation-cap"></i>
                                Grado
                            </label>
                            <select id="modalGrade" required>
                                <option value="">Seleccionar grado</option>
                                <option value="1">1°</option>
                                <option value="2">2°</option>
                                <option value="3">3°</option>
                                <option value="4">4°</option>
                                <option value="5">5°</option>
                                <option value="6">6°</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="modalHomeroom">
                                <i class="fas fa-home"></i>
                                Homeroom
                            </label>
                            <select id="modalHomeroom" required>
                                <option value="">Seleccionar homeroom</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="modalGroup">
                                <i class="fas fa-users"></i>
                                Grupo
                            </label>
                            <select id="modalGroup">
                                <option value="">Seleccionar grupo (opcional)</option>
                                <option value="1">1</option>
                                <option value="2">2</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="modalPeriod">
                                <i class="fas fa-clock"></i>
                                Período
                            </label>
                            <select id="modalPeriod" required>
                                <option value="">Seleccionar período</option>
                                <option value="P1">P1 (7:55 AM - 8:50 AM)</option>
                                <option value="P2">P2 (9:20 AM - 10:15 AM)</option>
                                <option value="P3">P3 (10:20 AM - 11:15 AM)</option>
                                <option value="P4">P4 (11:20 AM - 12:15 PM)</option>
                                <option value="P5">P5 (1:00 PM - 1:55 PM)</option>
                                <option value="P6">P6 (2:00 PM - 2:50 PM)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="modalSubject">
                            <i class="fas fa-book"></i>
                            Materia
                        </label>
                        <input type="text" id="modalSubject" value="Tecnología" readonly class="readonly-input">
                    </div>
                    
                    <div class="form-group">
                        <label for="modalTopic">
                            <i class="fas fa-lightbulb"></i>
                            Tema
                        </label>
                        <input type="text" id="modalTopic" placeholder="Ej: Fracciones (opcional)">
                    </div>
                    
                    <div class="form-group">
                        <label for="modalDescription">
                            <i class="fas fa-align-left"></i>
                            Descripción
                        </label>
                        <textarea id="modalDescription" placeholder="Descripción de la clase..." rows="3"></textarea>
                    </div>
                    
                    <input type="hidden" id="modalCycleDay" value="${cycleDay}">
                    <input type="hidden" id="modalCycle" value="${cycle}">
                </div>
                <div class="modal-footer schedule-modal-footer">
                    <button class="btn-secondary cancel-modal">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="btn-primary save-modal">
                        <i class="fas fa-save"></i> Guardar Horario
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Actualizar opciones de homeroom cuando cambie el grado
        modal.querySelector('#modalGrade').addEventListener('change', () => {
            this.updateModalHomeroomOptions();
        });

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.querySelector('.cancel-modal').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        modal.querySelector('.save-modal').addEventListener('click', () => {
            this.saveScheduleFromModal();
            closeModal();
        });
    }

    // Métodos para gestión de años escolares
    changeSchoolYear() {
        this.currentSchoolYear = document.getElementById('schoolYearSelect').value;
        const [startYear, endYear] = this.currentSchoolYear.split('-');
        this.currentYear = parseInt(startYear);
        this.currentMonth = 7; // Agosto
        this.updateMonthDisplay();
        this.updateCycleStartDaySelector();
        this.initializeCycleDates();
        this.renderAnnualCalendar();
        this.showNotification(`Cambiado a año escolar ${this.currentSchoolYear}`, 'info');
    }

    showAddSchoolYearModal() {
        const modal = document.createElement('div');
        modal.className = 'modal schedule-modal';
        modal.innerHTML = `
            <div class="modal-content schedule-modal-content">
                <div class="modal-header schedule-modal-header">
                    <div class="modal-title">
                        <i class="fas fa-calendar-plus"></i>
                        <h3>Nuevo Año Escolar</h3>
                    </div>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body schedule-modal-body">
                    <div class="form-group">
                        <label for="newSchoolYearStart">
                            <i class="fas fa-calendar"></i>
                            Año de inicio
                        </label>
                        <input type="number" id="newSchoolYearStart" min="2025" max="2030" value="2026">
                    </div>
                    <div class="form-group">
                        <label for="newSchoolYearEnd">
                            <i class="fas fa-calendar"></i>
                            Año de fin
                        </label>
                        <input type="number" id="newSchoolYearEnd" min="2026" max="2031" value="2027">
                    </div>
                </div>
                <div class="modal-footer schedule-modal-footer">
                    <button class="btn-secondary cancel-modal">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="btn-primary save-modal">
                        <i class="fas fa-save"></i> Crear Año Escolar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.querySelector('.cancel-modal').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        modal.querySelector('.save-modal').addEventListener('click', () => {
            const startYear = document.getElementById('newSchoolYearStart').value;
            const endYear = document.getElementById('newSchoolYearEnd').value;
            
            if (parseInt(endYear) !== parseInt(startYear) + 1) {
                alert('El año escolar debe ser de un año completo (ej: 2026-2027)');
                return;
            }
            
            const newSchoolYear = `${startYear}-${endYear}`;
            this.schoolYears.push(newSchoolYear);
            this.updateSchoolYearSelector();
            this.saveToStorage();
            closeModal();
            this.showNotification(`Año escolar ${newSchoolYear} creado`, 'success');
        });
    }

    updateSchoolYearSelector() {
        const selector = document.getElementById('schoolYearSelect');
        selector.innerHTML = this.schoolYears.map(year => 
            `<option value="${year}" ${year === this.currentSchoolYear ? 'selected' : ''}>${year}</option>`
        ).join('');
    }

    showNonSchoolDaysModal() {
        const modal = document.createElement('div');
        modal.className = 'modal schedule-modal';
        modal.innerHTML = `
            <div class="modal-content schedule-modal-content">
                <div class="modal-header schedule-modal-header">
                    <div class="modal-title">
                        <i class="fas fa-calendar-times"></i>
                        <h3>Gestionar Días No Lectivos</h3>
                    </div>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body schedule-modal-body">
                    <div class="form-group">
                        <label for="nonSchoolDate">
                            <i class="fas fa-calendar"></i>
                            Fecha
                        </label>
                        <input type="date" id="nonSchoolDate">
                    </div>
                    <div class="form-group">
                        <label for="nonSchoolReason">
                            <i class="fas fa-comment"></i>
                            Motivo
                        </label>
                        <input type="text" id="nonSchoolReason" placeholder="Ej: Día festivo, Vacaciones, etc.">
                    </div>
                    <div class="non-school-days-list" id="nonSchoolDaysList">
                        <!-- Se llena dinámicamente -->
                    </div>
                </div>
                <div class="modal-footer schedule-modal-footer">
                    <button class="btn-secondary cancel-modal">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="btn-primary add-non-school-day">
                        <i class="fas fa-plus"></i> Agregar Día
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.renderNonSchoolDaysList();

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.querySelector('.cancel-modal').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        modal.querySelector('.add-non-school-day').addEventListener('click', () => {
            const date = document.getElementById('nonSchoolDate').value;
            const reason = document.getElementById('nonSchoolReason').value;
            
            if (!date || !reason) {
                alert('Por favor completa todos los campos');
                return;
            }
            
            if (!this.nonSchoolDays[this.currentSchoolYear]) {
                this.nonSchoolDays[this.currentSchoolYear] = [];
            }
            
            this.nonSchoolDays[this.currentSchoolYear].push({date, reason});
            this.saveToStorage();
            this.renderNonSchoolDaysList();
            this.renderAnnualCalendar();
            
            // Recalcular fechas del ciclo
            this.recalculateCycleDates();
            
            this.showNotification('Día no lectivo agregado', 'success');
        });
    }

    renderNonSchoolDaysList() {
        const list = document.getElementById('nonSchoolDaysList');
        const days = this.nonSchoolDays[this.currentSchoolYear] || [];
        
        if (days.length === 0) {
            list.innerHTML = '<p>No hay días no lectivos configurados</p>';
            return;
        }
        
        list.innerHTML = days.map(day => `
            <div class="non-school-day-item">
                <span>${this.formatDate(day.date)}</span>
                <span>${day.reason}</span>
                <button class="delete-non-school-day" data-date="${day.date}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
        
        // Event listeners para eliminar días
        list.querySelectorAll('.delete-non-school-day').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const date = e.target.closest('.delete-non-school-day').dataset.date;
                this.nonSchoolDays[this.currentSchoolYear] = this.nonSchoolDays[this.currentSchoolYear].filter(d => d.date !== date);
                this.saveToStorage();
                this.renderNonSchoolDaysList();
                this.renderAnnualCalendar();
                
                // Recalcular fechas del ciclo
                this.recalculateCycleDates();
                
                this.showNotification('Día no lectivo eliminado', 'info');
            });
        });
    }

    isNonSchoolDay(date) {
        const days = this.nonSchoolDays[this.currentSchoolYear] || [];
        return days.some(day => day.date === date);
    }

    isWeekend(date) {
        const dayOfWeek = new Date(date).getDay();
        return dayOfWeek === 0 || dayOfWeek === 6; // Domingo o Sábado
    }

    getCycleDayForDate(date) {
        // Si hay un día personalizado, usarlo
        if (this.customCycleDays[this.currentSchoolYear] && this.customCycleDays[this.currentSchoolYear][date]) {
            return this.customCycleDays[this.currentSchoolYear][date];
        }
        
        // Obtener el día de inicio del ciclo para este año escolar
        const cycleStartDay = this.cycleStartDays[this.currentSchoolYear] || 1;
        
        // Calcular día del ciclo basado en días lectivos
        const startDate = new Date(this.currentYear, 7, cycleStartDay); // Mes 7 = Agosto
        const currentDate = new Date(date);
        let schoolDays = 0;
        
        for (let d = new Date(startDate); d <= currentDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            if (!this.isWeekend(dateStr) && !this.isNonSchoolDay(dateStr)) {
                schoolDays++;
            }
        }
        
        return ((schoolDays - 1) % 6) + 1; // Ciclo de 6 días
    }

    updateCycleStartDay() {
        const startDay = parseInt(document.getElementById('cycleStartDay').value);
        this.cycleStartDays[this.currentSchoolYear] = startDay;
        
        // Recalcular las fechas del ciclo
        this.recalculateCycleDates();
        
        this.saveToStorage();
        this.renderAnnualCalendar();
        this.showNotification(`Día de inicio del ciclo cambiado a día ${startDay}. Fechas recalculadas automáticamente.`, 'info');
    }

    recalculateCycleDates() {
        // Limpiar fechas existentes
        this.cycleDates[this.currentSchoolYear] = {};
        
        const startDay = this.cycleStartDays[this.currentSchoolYear] || 1;
        const startDate = new Date(this.currentYear, 7, startDay); // Agosto
        
        let currentDate = new Date(startDate);
        let cycleDay = 1;
        
        // Buscar el primer día lectivo (no fin de semana ni festivo)
        while (this.isWeekend(currentDate.toISOString().split('T')[0]) || 
               this.isNonSchoolDay(currentDate.toISOString().split('T')[0])) {
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Asignar los 6 días del ciclo, saltando fines de semana y festivos
        while (cycleDay <= 6) {
            const dateStr = currentDate.toISOString().split('T')[0];
            
            // Solo asignar si es día lectivo
            if (!this.isWeekend(dateStr) && !this.isNonSchoolDay(dateStr)) {
                this.cycleDates[this.currentSchoolYear][cycleDay.toString()] = dateStr;
                cycleDay++;
            }
            
            // Avanzar al siguiente día
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Actualizar la visualización
        this.updateCycleDateDisplay();
        this.renderCalendar();
    }

    updateCycleStartDaySelector() {
        const selector = document.getElementById('cycleStartDay');
        const currentStartDay = this.cycleStartDays[this.currentSchoolYear] || 1;
        selector.value = currentStartDay;
    }

    // Métodos para fechas del ciclo
    updateCycleDate(cycleDay, date) {
        if (!this.cycleDates[this.currentSchoolYear]) {
            this.cycleDates[this.currentSchoolYear] = {};
        }
        this.cycleDates[this.currentSchoolYear][cycleDay] = date;
        this.saveToStorage();
        this.updateCycleDateDisplay();
        this.renderCalendar();
        this.showNotification(`Día ${cycleDay} actualizado a ${this.formatDate(date)}`, 'success');
    }

    updateCycleDateDisplay() {
        const cycleDates = this.cycleDates[this.currentSchoolYear] || {};
        
        // Actualizar inputs
        document.querySelectorAll('.cycle-date-input').forEach(input => {
            const cycleDay = input.dataset.cycleDay;
            const date = cycleDates[cycleDay] || '';
            input.value = date;
        });
        
        // Actualizar headers
        for (let i = 1; i <= 6; i++) {
            const dateElement = document.getElementById(`day${i}-date`);
            const date = cycleDates[i.toString()];
            if (date) {
                const formattedDate = this.formatDateForDisplay(date);
                dateElement.textContent = formattedDate;
                dateElement.classList.add('editable');
            } else {
                dateElement.textContent = '-';
                dateElement.classList.remove('editable');
            }
        }
    }

    formatDateForDisplay(dateStr) {
        const date = new Date(dateStr);
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const dayName = dayNames[date.getDay()];
        const dayNumber = date.getDate();
        return `${dayName} ${dayNumber}`;
    }

    showDateEditModal(cycleDay) {
        const modal = document.createElement('div');
        modal.className = 'modal schedule-modal';
        modal.innerHTML = `
            <div class="modal-content schedule-modal-content">
                <div class="modal-header schedule-modal-header">
                    <div class="modal-title">
                        <i class="fas fa-calendar-day"></i>
                        <h3>Editar Día ${cycleDay}</h3>
                    </div>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body schedule-modal-body">
                    <div class="form-group">
                        <label for="editCycleDate">
                            <i class="fas fa-calendar"></i>
                            Fecha
                        </label>
                        <input type="date" id="editCycleDate" value="${this.cycleDates[this.currentSchoolYear]?.[cycleDay] || ''}">
                    </div>
                </div>
                <div class="modal-footer schedule-modal-footer">
                    <button class="btn-secondary cancel-modal">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="btn-primary save-modal">
                        <i class="fas fa-save"></i> Guardar Fecha
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.querySelector('.cancel-modal').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        modal.querySelector('.save-modal').addEventListener('click', () => {
            const date = document.getElementById('editCycleDate').value;
            this.updateCycleDate(cycleDay, date);
            closeModal();
        });
    }

    initializeCycleDates() {
        if (!this.cycleDates[this.currentSchoolYear]) {
            this.cycleDates[this.currentSchoolYear] = {};
            // Inicializar con fechas por defecto basadas en el día de inicio
            const startDay = this.cycleStartDays[this.currentSchoolYear] || 1;
            const startDate = new Date(this.currentYear, 7, startDay); // Agosto
            
            let currentDate = new Date(startDate);
            let cycleDay = 1;
            
            // Buscar el primer día lectivo (no fin de semana ni festivo)
            while (this.isWeekend(currentDate.toISOString().split('T')[0]) || 
                   this.isNonSchoolDay(currentDate.toISOString().split('T')[0])) {
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            // Asignar los 6 días del ciclo, saltando fines de semana y festivos
            while (cycleDay <= 6) {
                const dateStr = currentDate.toISOString().split('T')[0];
                
                // Solo asignar si es día lectivo
                if (!this.isWeekend(dateStr) && !this.isNonSchoolDay(dateStr)) {
                    this.cycleDates[this.currentSchoolYear][cycleDay.toString()] = dateStr;
                    cycleDay++;
                }
                
                // Avanzar al siguiente día
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        this.updateCycleDateDisplay();
    }

    // Métodos para configuración por mes
    saveMonthCycleConfig() {
        const month = parseInt(document.getElementById('monthSelect').value);
        const firstCycleDay = parseInt(document.getElementById('firstCycleDay').value);
        
        if (!this.monthCycleConfig[this.currentSchoolYear]) {
            this.monthCycleConfig[this.currentSchoolYear] = {};
        }
        
        this.monthCycleConfig[this.currentSchoolYear][month] = firstCycleDay;
        this.saveToStorage();
        
        // Recalcular fechas del ciclo para el mes seleccionado
        this.calculateCycleDatesForMonth(month, firstCycleDay);
        
        this.showNotification(`Configuración guardada: ${this.getMonthName(month)} comenzará con Día ${firstCycleDay}`, 'success');
    }

    calculateCycleDatesForMonth(month, firstCycleDay) {
        const year = this.currentYear;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let currentCycleDay = firstCycleDay;
        let date = 1;
        
        // Buscar el primer día lectivo del mes
        while (date <= daysInMonth) {
            const dateStr = new Date(year, month, date).toISOString().split('T')[0];
            
            if (!this.isWeekend(dateStr) && !this.isNonSchoolDay(dateStr)) {
                // Asignar día del ciclo
                this.cycleDates[this.currentSchoolYear][currentCycleDay.toString()] = dateStr;
                
                // Avanzar al siguiente día del ciclo
                currentCycleDay = currentCycleDay === 6 ? 1 : currentCycleDay + 1;
            }
            
            date++;
        }
        
        this.updateCycleDateDisplay();
        this.renderCalendar();
    }

    updateMonthCyclePreview() {
        const month = parseInt(document.getElementById('monthSelect').value);
        const monthConfig = this.monthCycleConfig[this.currentSchoolYear]?.[month];
        
        if (monthConfig) {
            document.getElementById('firstCycleDay').value = monthConfig;
        } else {
            document.getElementById('firstCycleDay').value = '1';
        }
        
        // Mostrar vista previa del ciclo para este mes
        this.previewCycleForMonth(month);
    }

    previewCycleForMonth(month) {
        const firstCycleDay = parseInt(document.getElementById('firstCycleDay').value);
        const year = this.currentYear;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let currentCycleDay = firstCycleDay;
        let date = 1;
        const previewDates = {};
        
        // Calcular fechas del ciclo para vista previa
        while (date <= daysInMonth && Object.keys(previewDates).length < 6) {
            const dateStr = new Date(year, month, date).toISOString().split('T')[0];
            
            if (!this.isWeekend(dateStr) && !this.isNonSchoolDay(dateStr)) {
                previewDates[currentCycleDay.toString()] = dateStr;
                currentCycleDay = currentCycleDay === 6 ? 1 : currentCycleDay + 1;
            }
            
            date++;
        }
        
        // Actualizar inputs de vista previa
        document.querySelectorAll('.cycle-date-input').forEach(input => {
            const cycleDay = input.dataset.cycleDay;
            const previewDate = previewDates[cycleDay] || '';
            input.value = previewDate;
        });
    }

    getMonthName(month) {
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return monthNames[month];
    }

    // ===== MÉTODOS DE SUPABASE =====
    
    async onUserAuthenticated(user) {
        console.log('👤 Usuario autenticado:', user.email);
        this.currentUser = user;
        
        // Cargar años escolares del usuario
        await this.loadSchoolYearsFromSupabase();
        
        // Si no hay años escolares, crear uno por defecto
        if (this.schoolYears.length === 0) {
            await this.createDefaultSchoolYear();
        }
        
        // Sincronizar datos
        await this.syncWithSupabase();
    }

    async loadSchoolYearsFromSupabase() {
        if (!this.isSupabaseEnabled) return;
        
        try {
            const result = await this.supabaseService.getSchoolYears();
            if (result.success) {
                this.schoolYears = result.data.map(year => year.year_name);
                this.updateSchoolYearSelector();
                
                // Establecer año escolar activo
                const activeYear = result.data.find(year => year.is_active);
                if (activeYear) {
                    this.currentSchoolYear = activeYear.year_name;
                    this.currentSchoolYearId = activeYear.id;
                }
            }
        } catch (error) {
            console.error('Error cargando años escolares:', error);
        }
    }

    async createDefaultSchoolYear() {
        if (!this.isSupabaseEnabled) return;
        
        try {
            const result = await this.supabaseService.createSchoolYear('2025-2026', 2025, 2026);
            if (result.success) {
                this.currentSchoolYearId = result.data.id;
                this.schoolYears = ['2025-2026'];
                this.updateSchoolYearSelector();
            }
        } catch (error) {
            console.error('Error creando año escolar por defecto:', error);
        }
    }

    async syncWithSupabase() {
        if (!this.isSupabaseEnabled || !this.currentSchoolYearId) return;
        
        try {
            console.log('🔄 Sincronizando con Supabase...');
            
            // Sincronizar clases
            await this.syncClassesToSupabase();
            
            // Sincronizar días no lectivos
            await this.syncNonSchoolDaysToSupabase();
            
            // Sincronizar configuración de ciclos
            await this.syncCycleConfigToSupabase();
            
            console.log('✅ Sincronización completada');
            this.showNotification('Datos sincronizados con la nube', 'success');
        } catch (error) {
            console.error('Error sincronizando:', error);
            this.showNotification('Error al sincronizar datos', 'error');
        }
    }

    async syncClassesToSupabase() {
        if (!this.isSupabaseEnabled || !this.currentSchoolYearId) return;
        
        try {
            // Obtener clases existentes de Supabase
            const result = await this.supabaseService.getClasses(this.currentSchoolYearId);
            if (result.success) {
                const supabaseClasses = result.data;
                
                // Comparar con clases locales y sincronizar
                for (const localClass of this.classes) {
                    const existsInSupabase = supabaseClasses.find(sbClass => 
                        sbClass.date === localClass.date &&
                        sbClass.period === localClass.period &&
                        sbClass.cycle_day === localClass.cycleDay &&
                        sbClass.grade === localClass.grade &&
                        sbClass.group === localClass.group
                    );
                    
                    if (!existsInSupabase) {
                        // Crear clase en Supabase
                        await this.supabaseService.createClass({
                            school_year_id: this.currentSchoolYearId,
                            grade: localClass.grade,
                            group: localClass.group,
                            subject: localClass.subject,
                            topic: localClass.topic,
                            description: localClass.description,
                            date: localClass.date,
                            period: localClass.period,
                            cycle_day: localClass.cycleDay,
                            notes: localClass.notes,
                            completed: localClass.completed
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error sincronizando clases:', error);
        }
    }

    async syncNonSchoolDaysToSupabase() {
        if (!this.isSupabaseEnabled || !this.currentSchoolYearId) return;
        
        try {
            const nonSchoolDays = this.nonSchoolDays[this.currentSchoolYear] || [];
            
            for (const day of nonSchoolDays) {
                await this.supabaseService.createNonSchoolDay({
                    school_year_id: this.currentSchoolYearId,
                    date: day.date,
                    reason: day.reason
                });
            }
        } catch (error) {
            console.error('Error sincronizando días no lectivos:', error);
        }
    }

    async syncCycleConfigToSupabase() {
        if (!this.isSupabaseEnabled || !this.currentSchoolYearId) return;
        
        try {
            const config = this.monthCycleConfig[this.currentSchoolYear] || {};
            
            for (const [month, firstCycleDay] of Object.entries(config)) {
                await this.supabaseService.upsertMonthCycleConfig({
                    school_year_id: this.currentSchoolYearId,
                    month: parseInt(month),
                    first_cycle_day: firstCycleDay
                });
            }
        } catch (error) {
            console.error('Error sincronizando configuración de ciclos:', error);
        }
    }

    // Método para guardar clase en Supabase
    async saveClassToSupabase(classData) {
        if (!this.isSupabaseEnabled || !this.currentSchoolYearId) return;
        
        try {
            const result = await this.supabaseService.createClass({
                school_year_id: this.currentSchoolYearId,
                ...classData
            });
            
            if (result.success) {
                console.log('✅ Clase guardada en Supabase');
            }
        } catch (error) {
            console.error('Error guardando clase en Supabase:', error);
        }
    }

    // Método para actualizar clase en Supabase
    async updateClassInSupabase(classId, updates) {
        if (!this.isSupabaseEnabled) return;
        
        try {
            const result = await this.supabaseService.updateClass(classId, updates);
            
            if (result.success) {
                console.log('✅ Clase actualizada en Supabase');
            }
        } catch (error) {
            console.error('Error actualizando clase en Supabase:', error);
        }
    }

    // Método para eliminar clase de Supabase
    async deleteClassFromSupabase(classId) {
        if (!this.isSupabaseEnabled) return;
        
        try {
            const result = await this.supabaseService.deleteClass(classId);
            
            if (result.success) {
                console.log('✅ Clase eliminada de Supabase');
            }
        } catch (error) {
            console.error('Error eliminando clase de Supabase:', error);
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM cargado, inicializando ClassPlanner...');
    window.classPlanner = new ClassPlanner();
});
