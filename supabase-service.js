// Servicio de Supabase para ClassPlanner
class SupabaseService {
    constructor() {
        this.client = window.supabaseClient;
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        
        // Escuchar cambios de conectividad
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processSyncQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // ===== AUTENTICACIÓN =====
    async signUp(email, password, fullName) {
        try {
            const { data, error } = await this.client.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error signing up:', error);
            return { success: false, error: error.message };
        }
    }

    async signIn(email, password) {
        try {
            const { data, error } = await this.client.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error signing in:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            const { error } = await this.client.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error signing out:', error);
            return { success: false, error: error.message };
        }
    }

    getCurrentUser() {
        return this.client.auth.getUser();
    }

    // ===== AÑOS ESCOLARES =====
    async getSchoolYears() {
        try {
            const { data, error } = await this.client
                .from('school_years')
                .select('*')
                .order('start_year', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error getting school years:', error);
            return { success: false, error: error.message };
        }
    }

    async createSchoolYear(yearName, startYear, endYear) {
        try {
            const { data, error } = await this.client
                .from('school_years')
                .insert({
                    year_name: yearName,
                    start_year: startYear,
                    end_year: endYear
                })
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error creating school year:', error);
            return { success: false, error: error.message };
        }
    }

    async updateSchoolYear(id, updates) {
        try {
            const { data, error } = await this.client
                .from('school_years')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error updating school year:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== CLASES/PLANEACIONES =====
    async getClasses(schoolYearId) {
        try {
            const { data, error } = await this.client
                .from('classes')
                .select('*')
                .eq('school_year_id', schoolYearId)
                .order('date', { ascending: true });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error getting classes:', error);
            return { success: false, error: error.message };
        }
    }

    async createClass(classData) {
        try {
            const { data, error } = await this.client
                .from('classes')
                .insert(classData)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error creating class:', error);
            return { success: false, error: error.message };
        }
    }

    async updateClass(id, updates) {
        try {
            const { data, error } = await this.client
                .from('classes')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error updating class:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteClass(id) {
        try {
            const { error } = await this.client
                .from('classes')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting class:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== DÍAS NO LECTIVOS =====
    async getNonSchoolDays(schoolYearId) {
        try {
            const { data, error } = await this.client
                .from('non_school_days')
                .select('*')
                .eq('school_year_id', schoolYearId)
                .order('date', { ascending: true });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error getting non school days:', error);
            return { success: false, error: error.message };
        }
    }

    async createNonSchoolDay(nonSchoolDayData) {
        try {
            const { data, error } = await this.client
                .from('non_school_days')
                .insert(nonSchoolDayData)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error creating non school day:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteNonSchoolDay(id) {
        try {
            const { error } = await this.client
                .from('non_school_days')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting non school day:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== CONFIGURACIÓN DE CICLOS =====
    async getMonthCycleConfig(schoolYearId) {
        try {
            const { data, error } = await this.client
                .from('month_cycle_config')
                .select('*')
                .eq('school_year_id', schoolYearId);
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error getting month cycle config:', error);
            return { success: false, error: error.message };
        }
    }

    async upsertMonthCycleConfig(configData) {
        try {
            const { data, error } = await this.client
                .from('month_cycle_config')
                .upsert(configData, { onConflict: 'user_id,school_year_id,month' })
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error upserting month cycle config:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== SINCRONIZACIÓN =====
    async syncAllData(schoolYearId) {
        if (!this.isOnline) {
            console.log('Offline - queuing sync operation');
            this.syncQueue.push({ type: 'syncAll', schoolYearId });
            return { success: false, error: 'Offline' };
        }

        try {
            const [classesResult, nonSchoolDaysResult, configResult] = await Promise.all([
                this.getClasses(schoolYearId),
                this.getNonSchoolDays(schoolYearId),
                this.getMonthCycleConfig(schoolYearId)
            ]);

            return {
                success: true,
                data: {
                    classes: classesResult.data || [],
                    nonSchoolDays: nonSchoolDaysResult.data || [],
                    monthCycleConfig: configResult.data || []
                }
            };
        } catch (error) {
            console.error('Error syncing data:', error);
            return { success: false, error: error.message };
        }
    }

    async processSyncQueue() {
        if (!this.isOnline || this.syncQueue.length === 0) return;

        console.log(`Processing ${this.syncQueue.length} queued operations`);
        
        for (const operation of this.syncQueue) {
            try {
                if (operation.type === 'syncAll') {
                    await this.syncAllData(operation.schoolYearId);
                }
            } catch (error) {
                console.error('Error processing sync queue:', error);
            }
        }
        
        this.syncQueue = [];
    }

    // ===== MIGRACIÓN DESDE LOCALSTORAGE =====
    async migrateFromLocalStorage(localData, schoolYearId) {
        try {
            const { classes, nonSchoolDays, monthCycleConfig } = localData;
            
            // Migrar clases
            if (classes && classes.length > 0) {
                const classesWithSchoolYear = classes.map(cls => ({
                    ...cls,
                    school_year_id: schoolYearId,
                    id: undefined // Dejar que Supabase genere el ID
                }));
                
                const { error: classesError } = await this.client
                    .from('classes')
                    .insert(classesWithSchoolYear);
                
                if (classesError) throw classesError;
            }

            // Migrar días no lectivos
            if (nonSchoolDays && nonSchoolDays.length > 0) {
                const nonSchoolDaysWithSchoolYear = nonSchoolDays.map(day => ({
                    ...day,
                    school_year_id: schoolYearId,
                    id: undefined
                }));
                
                const { error: nonSchoolError } = await this.client
                    .from('non_school_days')
                    .insert(nonSchoolDaysWithSchoolYear);
                
                if (nonSchoolError) throw nonSchoolError;
            }

            // Migrar configuración de ciclos
            if (monthCycleConfig && Object.keys(monthCycleConfig).length > 0) {
                const configArray = Object.entries(monthCycleConfig).map(([month, firstCycleDay]) => ({
                    school_year_id: schoolYearId,
                    month: parseInt(month),
                    first_cycle_day: firstCycleDay
                }));
                
                const { error: configError } = await this.client
                    .from('month_cycle_config')
                    .insert(configArray);
                
                if (configError) throw configError;
            }

            return { success: true };
        } catch (error) {
            console.error('Error migrating from localStorage:', error);
            return { success: false, error: error.message };
        }
    }
}

// Exportar para uso global
window.SupabaseService = SupabaseService;



