// Clase para manejar las planeaciones de clases
class ClassPlanner {
    constructor() {
        this.classes = [];
        this.currentGrade = 'all';
        this.currentView = 'list'; // 'list' o 'calendar'
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.updateGradeCounts();
        this.renderClasses();
        this.updateStats();
        this.updateSubjectFilter();
        this.setDefaultDate();
        this.renderCalendar();
    }

    setupEventListeners() {
        // Formulario de nueva planeación
        document.getElementById('planForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addClass();
        });

        // Cambio de grado para actualizar grupos y materias disponibles
        document.getElementById('grade').addEventListener('change', () => {
            this.updateGroupOptions();
            this.updateSubjectOptions();
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
            this.switchView('list');
        });

        document.getElementById('calendarViewBtn').addEventListener('click', () => {
            this.switchView('calendar');
        });

        // Botón para asignar horario
        document.getElementById('addScheduleBtn').addEventListener('click', () => {
            this.showAddScheduleModal();
        });
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    addClass() {
        console.log('Iniciando addClass...');
        const grade = document.getElementById('grade').value;
        const subject = document.getElementById('subject').value;
        const topic = document.getElementById('topic').value.trim();
        const date = document.getElementById('date').value;
        const cycleDay = document.getElementById('cycleDay').value;
        const period = document.getElementById('period').value;
        const group = document.getElementById('group').value;
        const group2 = document.getElementById('group2').value;
        const description = document.getElementById('description').value.trim();
        const notes = document.getElementById('notes').value.trim();

        console.log('Datos capturados:', { grade, subject, topic, date, cycleDay, period, group, group2 });

        if (!grade || !subject || !date || !cycleDay || !period || !group) {
            alert('Por favor completa todos los campos obligatorios');
            return;
        }

        // Validar grupos según el grado
        if ((grade === '1' || grade === '2') && !['A', 'B', 'C'].includes(group)) {
            alert('Para 1° y 2° grado solo se permiten grupos A, B y C');
            return;
        }
        
        if ((grade === '3' || grade === '4' || grade === '5' || grade === '6') && !['A', 'B'].includes(group)) {
            alert('Para 3° a 6° grado solo se permiten grupos A y B');
            return;
        }

        // Validar materia según el grado
        if ((grade === '3' || grade === '4' || grade === '5' || grade === '6') && subject !== 'Tecnología') {
            alert('Para 3° a 6° grado solo se permite la materia Tecnología');
            return;
        }

        // Combinar grupos si se selecciona grupo2
        const finalGroup = group2 ? `${group}-${group2}` : group;

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

        console.log('Nueva clase creada:', newClass);
        console.log('Clases antes de agregar:', this.classes.length);

        this.classes.push(newClass);
        console.log('Clases después de agregar:', this.classes.length);
        
        this.saveToStorage();
        this.updateGradeCounts();
        this.renderClasses();
        this.updateStats();
        this.updateSubjectFilter();
        this.clearForm();
        this.showNotification('Planeación guardada exitosamente', 'success');
        
        console.log('addClass completado');
    }

    clearForm() {
        document.getElementById('planForm').reset();
        this.setDefaultDate();
    }

    renderClasses() {
        const classesList = document.getElementById('classesList');
        const filterLevel = document.getElementById('filterLevel').value;
        const filterGroup = document.getElementById('filterGroup').value;
        const filterPeriod = document.getElementById('filterPeriod').value;
        const filterCycleDay = document.getElementById('filterCycleDay').value;

        let filteredClasses = this.classes;

        // Aplicar filtro por grado actual
        if (this.currentGrade !== 'all') {
            filteredClasses = filteredClasses.filter(cls => cls.grade === this.currentGrade);
        }

        // Aplicar filtro por nivel
        if (filterLevel) {
            filteredClasses = filteredClasses.filter(cls => cls.grade === filterLevel);
        }

        // Aplicar filtro por grupo
        if (filterGroup) {
            filteredClasses = filteredClasses.filter(cls => cls.group === filterGroup);
        }

        // Aplicar filtro por período
        if (filterPeriod) {
            filteredClasses = filteredClasses.filter(cls => cls.period === filterPeriod);
        }

        // Aplicar filtro por día del ciclo
        if (filterCycleDay) {
            filteredClasses = filteredClasses.filter(cls => cls.cycleDay === filterCycleDay);
        }

        // Ordenar por día del ciclo y período
        filteredClasses.sort((a, b) => {
            if (a.cycleDay !== b.cycleDay) {
                return parseInt(a.cycleDay) - parseInt(b.cycleDay);
            }
            return a.period.localeCompare(b.period);
        });

        if (filteredClasses.length === 0) {
            classesList.innerHTML = this.getEmptyStateHTML();
            return;
        }

        classesList.innerHTML = filteredClasses.map(cls => this.getClassHTML(cls)).join('');
        
        // Agregar event listeners a los checkboxes y botones de eliminar
        this.attachClassEventListeners();
    }

    getClassHTML(cls) {
        const completedClass = cls.completed ? 'completed' : '';
        const hasNotes = cls.notes && cls.notes.trim() !== '';
        const formattedDate = this.formatDate(cls.date);
        const periodInfo = this.getPeriodInfo(cls.period);
        
        return `
            <div class="class-item ${completedClass}" data-id="${cls.id}">
                <div class="class-header">
                    <div>
                        <div class="class-title">${cls.topic || 'Sin tema definido'}</div>
                        <div class="class-grade">${cls.grade}° Grado - Grupo ${cls.group}</div>
                    </div>
                    ${hasNotes ? '<div class="notes-indicator" title="Esta clase tiene notas"><i class="fas fa-sticky-note"></i></div>' : ''}
                </div>
                
                <div class="class-meta">
                    <div class="meta-item">
                        <i class="fas fa-book"></i>
                        <span>${cls.subject}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-calendar"></i>
                        <span>${formattedDate}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-calendar-day"></i>
                        <span>Día ${cls.cycleDay}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        <span>${periodInfo}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-users"></i>
                        <span>Grupo ${cls.group}</span>
                    </div>
                </div>
                
                ${cls.description ? `<div class="class-description">${cls.description}</div>` : ''}
                
                ${hasNotes ? `
                    <div class="class-notes">
                        <div class="notes-header">
                            <i class="fas fa-sticky-note"></i>
                            <span>Notas de progreso:</span>
                        </div>
                        <div class="notes-content">${cls.notes}</div>
                    </div>
                ` : ''}
                
                <div class="class-actions">
                    <div class="checkbox-container">
                        <input type="checkbox" id="check-${cls.id}" ${cls.completed ? 'checked' : ''}>
                        <label for="check-${cls.id}">Clase vista</label>
                    </div>
                    <div class="action-buttons">
                        <button class="edit-notes-btn" data-id="${cls.id}" title="Editar notas">
                            <i class="fas fa-edit"></i> Notas
                        </button>
                        <button class="delete-btn" data-id="${cls.id}">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getEmptyStateHTML() {
        return `
            <div class="empty-state">
                <i class="fas fa-chalkboard"></i>
                <h3>No hay clases registradas</h3>
                <p>Agrega tu primera planeación usando el formulario de la izquierda</p>
            </div>
        `;
    }

    attachClassEventListeners() {
        // Event listeners para checkboxes
        document.querySelectorAll('.class-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const classId = e.target.id.replace('check-', '');
                this.toggleClassCompletion(classId);
            });
        });

        // Event listeners para botones de eliminar
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const classId = e.target.closest('.delete-btn').dataset.id;
                this.deleteClass(classId);
            });
        });

        // Event listeners para botones de editar notas
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
            this.saveToStorage();
            this.renderClasses();
            this.updateStats();
            
            const status = this.classes[classIndex].completed ? 'completada' : 'pendiente';
            this.showNotification(`Clase marcada como ${status}`, 'info');
        }
    }

    deleteClass(classId) {
        if (confirm('¿Estás seguro de que quieres eliminar esta clase?')) {
            this.classes = this.classes.filter(cls => cls.id !== classId);
            this.saveToStorage();
            this.renderClasses();
            this.updateStats();
            this.updateSubjectFilter();
            this.showNotification('Clase eliminada', 'success');
        }
    }

    updateStats() {
        const totalClasses = this.classes.length;
        const completedClasses = this.classes.filter(cls => cls.completed).length;
        const pendingClasses = totalClasses - completedClasses;

        document.getElementById('totalClasses').textContent = totalClasses;
        document.getElementById('completedClasses').textContent = completedClasses;
        document.getElementById('pendingClasses').textContent = pendingClasses;
    }

    updateSubjectFilter() {
        const filterSubject = document.getElementById('filterSubject');
        const subjects = [...new Set(this.classes.map(cls => cls.subject))].sort();
        
        filterSubject.innerHTML = '<option value="">Todas las materias</option>';
        subjects.forEach(subject => {
            filterSubject.innerHTML += `<option value="${subject}">${subject}</option>`;
        });
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

    switchView(view) {
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
    }

    renderCalendar() {
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
                
                const classesInSlot = this.classes.filter(cls => 
                    cls.period === period && cls.cycleDay === day
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
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
        };
        return date.toLocaleDateString('es-ES', options);
    }

    showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Estilos para la notificación
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#e53e3e' : '#667eea'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            animation: slideIn 0.3s ease-out;
        `;

        // Agregar estilos de animación
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Remover después de 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                if (style.parentNode) {
                    style.parentNode.removeChild(style);
                }
            }, 300);
        }, 3000);
    }

    // Persistencia local
    saveToStorage() {
        console.log('Guardando en localStorage...', this.classes.length, 'clases');
        localStorage.setItem('classPlanner_classes', JSON.stringify(this.classes));
        console.log('Guardado completado');
    }

    loadFromStorage() {
        console.log('Cargando desde localStorage...');
        const stored = localStorage.getItem('classPlanner_classes');
        this.classes = stored ? JSON.parse(stored) : [];
        console.log('Clases cargadas:', this.classes.length);
    }

    // Método para exportar datos
    exportData() {
        const dataStr = JSON.stringify(this.classes, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `planeaciones_clases_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    // Método para importar datos
    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedClasses = JSON.parse(e.target.result);
                if (Array.isArray(importedClasses)) {
                    this.classes = [...this.classes, ...importedClasses];
                    this.saveToStorage();
                    this.renderClasses();
                    this.updateStats();
                    this.updateSubjectFilter();
                    this.showNotification('Datos importados exitosamente', 'success');
                } else {
                    throw new Error('Formato de archivo inválido');
                }
            } catch (error) {
                this.showNotification('Error al importar datos', 'error');
            }
        };
        reader.readAsText(file);
    }
}

    showAddScheduleModal(period = null, day = null) {
        const modal = document.createElement('div');
        modal.className = 'schedule-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-calendar-plus"></i> Asignar Horario</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="scheduleForm">
                        <div class="form-group">
                            <label for="modalGrade">Grado:</label>
                            <select id="modalGrade" required>
                                <option value="">Seleccionar grado</option>
                                <option value="1">1° Grado</option>
                                <option value="2">2° Grado</option>
                                <option value="3">3° Grado</option>
                                <option value="4">4° Grado</option>
                                <option value="5">5° Grado</option>
                                <option value="6">6° Grado</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="modalSubject">Materia:</label>
                            <select id="modalSubject" required>
                                <option value="">Seleccionar materia</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="modalGroup">Grupo:</label>
                            <select id="modalGroup" required>
                                <option value="">Seleccionar grupo</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="modalGroup2">Grupo #2:</label>
                            <select id="modalGroup2">
                                <option value="">Seleccionar grupo #2 (opcional)</option>
                                <option value="1">Grupo 1</option>
                                <option value="2">Grupo 2</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="modalCycleDay">Día del ciclo:</label>
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
                            <label for="modalPeriod">Período:</label>
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
                        
                        <div class="form-group">
                            <label for="modalTopic">Tema:</label>
                            <input type="text" id="modalTopic" placeholder="Ej: Fracciones (opcional)">
                        </div>
                        
                        <div class="form-group">
                            <label for="modalDescription">Descripción:</label>
                            <textarea id="modalDescription" placeholder="Descripción de la clase..." rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary cancel-schedule">Cancelar</button>
                    <button class="btn-primary save-schedule">Guardar Horario</button>
                </div>
            </div>
        `;

        // Agregar estilos del modal
        const style = document.createElement('style');
        style.textContent = `
            .schedule-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2000;
                animation: fadeIn 0.3s ease-out;
            }
            .modal-content {
                background: white;
                border-radius: 15px;
                width: 90%;
                max-width: 500px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            .modal-header {
                padding: 20px 25px;
                border-bottom: 2px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .modal-header h3 {
                color: #4a5568;
                margin: 0;
                font-size: 1.3rem;
            }
            .modal-header h3 i {
                color: #667eea;
                margin-right: 10px;
            }
            .close-modal {
                background: none;
                border: none;
                font-size: 1.5rem;
                color: #718096;
                cursor: pointer;
                padding: 5px;
                border-radius: 5px;
                transition: all 0.3s ease;
            }
            .close-modal:hover {
                background: #f7fafc;
                color: #4a5568;
            }
            .modal-body {
                padding: 25px;
            }
            .modal-footer {
                padding: 20px 25px;
                border-top: 2px solid #e2e8f0;
                display: flex;
                gap: 15px;
                justify-content: flex-end;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(modal);

        // Pre-llenar campos si se especificaron
        if (period) {
            document.getElementById('modalPeriod').value = period;
        }
        if (day) {
            document.getElementById('modalCycleDay').value = day;
        }

        // Event listeners del modal
        const closeModal = () => {
            document.body.removeChild(modal);
            document.head.removeChild(style);
        };

        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.querySelector('.cancel-schedule').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Event listeners para actualizar opciones
        document.getElementById('modalGrade').addEventListener('change', () => {
            this.updateModalOptions();
        });

        modal.querySelector('.save-schedule').addEventListener('click', () => {
            this.saveScheduleFromModal();
            closeModal();
        });
    }

    updateModalOptions() {
        const grade = document.getElementById('modalGrade').value;
        const subjectSelect = document.getElementById('modalSubject');
        const groupSelect = document.getElementById('modalGroup');
        
        // Solo Tecnología para todos los grados
        subjectSelect.innerHTML = '<option value="Tecnología">Tecnología</option>';
        subjectSelect.value = 'Tecnología';
        
        // Limpiar opciones de grupo
        groupSelect.innerHTML = '<option value="">Seleccionar grupo</option>';
        
        if (grade === '1' || grade === '2') {
            // Para 1° y 2° grado, grupos A, B, C
            groupSelect.innerHTML += `
                <option value="A">Grupo A</option>
                <option value="B">Grupo B</option>
                <option value="C">Grupo C</option>
            `;
        } else if (grade === '3' || grade === '4' || grade === '5' || grade === '6') {
            // Para 3° a 6° grado, solo grupos A y B
            groupSelect.innerHTML += `
                <option value="A">Grupo A</option>
                <option value="B">Grupo B</option>
            `;
        }
    }

    saveScheduleFromModal() {
        const grade = document.getElementById('modalGrade').value;
        const subject = document.getElementById('modalSubject').value;
        const group = document.getElementById('modalGroup').value;
        const group2 = document.getElementById('modalGroup2').value;
        const cycleDay = document.getElementById('modalCycleDay').value;
        const period = document.getElementById('modalPeriod').value;
        const topic = document.getElementById('modalTopic').value.trim();
        const description = document.getElementById('modalDescription').value.trim();

        if (!grade || !subject || !group || !cycleDay || !period) {
            alert('Por favor completa todos los campos obligatorios');
            return;
        }

        // Combinar grupos si se selecciona grupo2
        const finalGroup = group2 ? `${group}-${group2}` : group;

        // Verificar si ya existe una clase en ese horario
        const existingClass = this.classes.find(cls => 
            cls.period === period && 
            cls.cycleDay === cycleDay && 
            cls.grade === grade && 
            cls.group === finalGroup
        );

        if (existingClass) {
            alert('Ya existe una clase asignada para este grado y grupo en este horario');
            return;
        }

        const newClass = {
            id: Date.now().toString(),
            grade: grade,
            subject: subject,
            topic: topic,
            date: new Date().toISOString().split('T')[0], // Fecha actual
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
        this.renderCalendar();
        this.updateStats();
        this.updateSubjectFilter();
        
        this.showNotification('Horario asignado exitosamente', 'success');
    }

    editScheduleItem(classId) {
        const classIndex = this.classes.findIndex(cls => cls.id === classId);
        if (classIndex === -1) return;

        const cls = this.classes[classIndex];
        this.showAddScheduleModal(cls.period, cls.cycleDay);
        
        // Pre-llenar con datos existentes
        setTimeout(() => {
            document.getElementById('modalGrade').value = cls.grade;
            document.getElementById('modalSubject').value = cls.subject;
            document.getElementById('modalGroup').value = cls.group;
            document.getElementById('modalTopic').value = cls.topic;
            document.getElementById('modalDescription').value = cls.description;
            this.updateModalOptions();
        }, 100);
    }

    deleteScheduleItem(classId) {
        if (confirm('¿Estás seguro de que quieres eliminar esta clase del horario?')) {
            this.classes = this.classes.filter(cls => cls.id !== classId);
            this.saveToStorage();
            this.updateGradeCounts();
            this.renderCalendar();
            this.updateStats();
            this.updateSubjectFilter();
            this.showNotification('Clase eliminada del horario', 'success');
        }
    }

    updateGroupOptions() {
        const grade = document.getElementById('grade').value;
        const groupSelect = document.getElementById('group');
        
        // Limpiar opciones actuales
        groupSelect.innerHTML = '<option value="">Seleccionar grupo</option>';
        
        if (grade === '1' || grade === '2') {
            // Para 1° y 2° grado, grupos A, B, C
            groupSelect.innerHTML += `
                <option value="A">Grupo A</option>
                <option value="B">Grupo B</option>
                <option value="C">Grupo C</option>
            `;
        } else if (grade === '3' || grade === '4' || grade === '5' || grade === '6') {
            // Para 3° a 6° grado, solo grupos A y B
            groupSelect.innerHTML += `
                <option value="A">Grupo A</option>
                <option value="B">Grupo B</option>
            `;
        }
    }

    updateSubjectOptions() {
        // Ya no necesitamos actualizar las opciones de materia ya que solo hay Tecnología
        // Este método se mantiene para compatibilidad pero no hace nada
        // La materia ya está fija como "Tecnología" en el HTML
    }

    // Nuevos métodos para navegación por grados
    switchToGrade(grade) {
        this.currentGrade = grade;
        
        // Actualizar botones activos
        document.querySelectorAll('.grade-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-grade="${grade}"]`).classList.add('active');
        
        // Actualizar título y descripción
        this.updateViewTitle();
        
        // Renderizar clases
        this.renderClasses();
    }

    updateViewTitle() {
        const titleElement = document.getElementById('currentGradeTitle');
        const descriptionElement = document.getElementById('currentGradeDescription');
        
        if (this.currentGrade === 'all') {
            titleElement.innerHTML = '<i class="fas fa-list"></i> Todas las Clases';
            descriptionElement.textContent = 'Visualizando todas las planeaciones';
        } else {
            const gradeNumber = this.currentGrade;
            const gradeClasses = this.classes.filter(cls => cls.grade === gradeNumber);
            const completedClasses = gradeClasses.filter(cls => cls.completed).length;
            
            titleElement.innerHTML = `<i class="fas fa-graduation-cap"></i> ${gradeNumber}° Grado`;
            descriptionElement.textContent = `${gradeClasses.length} clases registradas (${completedClasses} completadas)`;
        }
    }

    updateGradeCounts() {
        // Actualizar contador de "Todos"
        document.getElementById('count-all').textContent = this.classes.length;
        
        // Actualizar contadores por grado (solo hasta 6°)
        for (let i = 1; i <= 6; i++) {
            const count = this.classes.filter(cls => cls.grade === i.toString()).length;
            document.getElementById(`count-${i}`).textContent = count;
        }
    }

    editNotes(classId) {
        const classIndex = this.classes.findIndex(cls => cls.id === classId);
        if (classIndex === -1) return;

        const currentNotes = this.classes[classIndex].notes || '';
        
        // Crear modal para editar notas
        const modal = document.createElement('div');
        modal.className = 'notes-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Editar Notas de Progreso</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="modalNotes">Notas de progreso:</label>
                        <textarea id="modalNotes" placeholder="Documenta hasta dónde llegaste en la clase para poder retomar desde este punto..." rows="8">${currentNotes}</textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary cancel-notes">Cancelar</button>
                    <button class="btn-primary save-notes">Guardar Notas</button>
                </div>
            </div>
        `;

        // Agregar estilos del modal
        const style = document.createElement('style');
        style.textContent = `
            .notes-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2000;
                animation: fadeIn 0.3s ease-out;
            }
            .modal-content {
                background: white;
                border-radius: 15px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            .modal-header {
                padding: 20px 25px;
                border-bottom: 2px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .modal-header h3 {
                color: #4a5568;
                margin: 0;
                font-size: 1.3rem;
            }
            .modal-header h3 i {
                color: #667eea;
                margin-right: 10px;
            }
            .close-modal {
                background: none;
                border: none;
                font-size: 1.5rem;
                color: #718096;
                cursor: pointer;
                padding: 5px;
                border-radius: 5px;
                transition: all 0.3s ease;
            }
            .close-modal:hover {
                background: #f7fafc;
                color: #4a5568;
            }
            .modal-body {
                padding: 25px;
            }
            .modal-footer {
                padding: 20px 25px;
                border-top: 2px solid #e2e8f0;
                display: flex;
                gap: 15px;
                justify-content: flex-end;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(modal);

        // Event listeners del modal
        const closeModal = () => {
            document.body.removeChild(modal);
            document.head.removeChild(style);
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
            closeModal();
            
            const message = newNotes ? 'Notas actualizadas exitosamente' : 'Notas eliminadas';
            this.showNotification(message, 'success');
        });

        // Focus en el textarea
        setTimeout(() => {
            modal.querySelector('#modalNotes').focus();
        }, 100);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.classPlanner = new ClassPlanner();
});

// Funciones globales para exportar/importar (opcional)
function exportData() {
    if (window.classPlanner) {
        window.classPlanner.exportData();
    }
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        if (e.target.files[0]) {
            window.classPlanner.importData(e.target.files[0]);
        }
    };
    input.click();
}
