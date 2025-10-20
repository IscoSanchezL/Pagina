-- Esquema de base de datos para ClassPlanner
-- Ejecuta estos comandos en el SQL Editor de Supabase

-- Habilitar RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Tabla de usuarios (extiende auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de años escolares
CREATE TABLE public.school_years (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    year_name TEXT NOT NULL, -- Ejemplo: "2025-2026"
    start_year INTEGER NOT NULL,
    end_year INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, year_name)
);

-- Tabla de clases/planeaciones
CREATE TABLE public.classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    school_year_id UUID REFERENCES public.school_years(id) ON DELETE CASCADE,
    grade TEXT NOT NULL, -- "1", "2", "3", etc.
    group TEXT NOT NULL, -- "A-1", "B-2", etc.
    subject TEXT NOT NULL DEFAULT 'Tecnología',
    topic TEXT,
    description TEXT,
    date DATE NOT NULL,
    period INTEGER NOT NULL CHECK (period >= 1 AND period <= 6),
    cycle_day INTEGER NOT NULL CHECK (cycle_day >= 1 AND cycle_day <= 6),
    notes TEXT,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de días no lectivos
CREATE TABLE public.non_school_days (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    school_year_id UUID REFERENCES public.school_years(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, school_year_id, date)
);

-- Tabla de configuración de ciclos por mes
CREATE TABLE public.month_cycle_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    school_year_id UUID REFERENCES public.school_years(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 0 AND month <= 11), -- 0=Enero, 11=Diciembre
    first_cycle_day INTEGER NOT NULL CHECK (first_cycle_day >= 1 AND first_cycle_day <= 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, school_year_id, month)
);

-- Tabla de días de ciclo personalizados
CREATE TABLE public.custom_cycle_days (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    school_year_id UUID REFERENCES public.school_years(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    cycle_day INTEGER NOT NULL CHECK (cycle_day >= 1 AND cycle_day <= 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, school_year_id, date)
);

-- Políticas de seguridad (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.non_school_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.month_cycle_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_cycle_days ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para school_years
CREATE POLICY "Users can manage own school years" ON public.school_years
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para classes
CREATE POLICY "Users can manage own classes" ON public.classes
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para non_school_days
CREATE POLICY "Users can manage own non school days" ON public.non_school_days
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para month_cycle_config
CREATE POLICY "Users can manage own month cycle config" ON public.month_cycle_config
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para custom_cycle_days
CREATE POLICY "Users can manage own custom cycle days" ON public.custom_cycle_days
    FOR ALL USING (auth.uid() = user_id);

-- Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Índices para mejorar rendimiento
CREATE INDEX idx_classes_user_school_year ON public.classes(user_id, school_year_id);
CREATE INDEX idx_classes_date ON public.classes(date);
CREATE INDEX idx_classes_cycle_day ON public.classes(cycle_day);
CREATE INDEX idx_non_school_days_user_school_year ON public.non_school_days(user_id, school_year_id);
CREATE INDEX idx_non_school_days_date ON public.non_school_days(date);
CREATE INDEX idx_month_cycle_config_user_school_year ON public.month_cycle_config(user_id, school_year_id);
CREATE INDEX idx_custom_cycle_days_user_school_year ON public.custom_cycle_days(user_id, school_year_id);
CREATE INDEX idx_custom_cycle_days_date ON public.custom_cycle_days(date);



