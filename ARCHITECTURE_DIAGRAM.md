# Arquitectura ExamenI - Feature Builder (FDD)

## 📐 Diagrama de Capas - Clean Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTACIÓN (UI Layer)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Redux Store + Slices                                           │
│  ├─ personalSlice.ts (async thunks)                             │
│  │  ├─ cargarSubordinados()                                     │
│  │  ├─ crearPersonal()                                          │
│  │  ├─ actualizarPersonal()                                     │
│  │  └─ eliminarPersonal()                                       │
│  │                                                               │
│  Componentes UI                                                  │
│  ├─ EditarNombreBottomSheet.tsx                                 │
│  ├─ CrearPersonalBottomSheet.tsx                                │
│  ├─ GestionPersonalScreen.tsx                                   │
│  ├─ AuthShell.tsx (mejorado: KeyboardAvoidingView)              │
│  ├─ AuthTextField.tsx (mejorado: Toggle contraseña)             │
│  ├─ LoginScreen.tsx                                             │
│  ├─ ChangePasswordScreen.tsx                                    │
│  ├─ SubordinateRegistrationScreen.tsx                           │
│  ├─ PieChartResultados.tsx                                      │
│  └─ chartUtils.ts                                               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ implementa
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATOS (Data Layer)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  PersonalTerritorialRepository                                  │
│  ├─ obtenerSubordinados()                                       │
│  ├─ obtenerPorId()                                              │
│  ├─ crear()                                                     │
│  ├─ actualizar()                                                │
│  └─ eliminar()                                                  │
│       ▼                                                          │
│  PersonalTerritorialMapper                                      │
│  ├─ toDomain()           DTO → Entidad                          │
│  ├─ toDomainArray()      Array DTO → Array Entidad              │
│  └─ toDTO()              Entidad → DTO                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ implementa
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DOMINIO (Domain Layer)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Puertos (Interfaces)                                           │
│  ├─ IPersonalTerritorialRepository                              │
│  │  ├─ obtenerSubordinados()                                    │
│  │  ├─ obtenerPorId()                                           │
│  │  ├─ crear(DTO)                                               │
│  │  ├─ actualizar(DTO)                                          │
│  │  └─ eliminar(id)                                             │
│  │                                                               │
│  └─ IPersonalTerritorialDataSource                              │
│     (implementado por Supabase DataSource)                      │
│                                                                   │
│  Entidades                                                       │
│  └─ PersonalTerritorial                                         │
│     ├─ id: UUID                                                 │
│     ├─ cedula: string                                           │
│     ├─ nombresCompletos: string                                 │
│     ├─ email: string                                            │
│     ├─ telefono?: string                                        │
│     ├─ rol: 'COORDINADOR_PROVINCIAL' | 'COORDINADOR_RECINTO'    │
│     │       | 'VEEDOR'                                          │
│     ├─ provinciaId?: UUID                                       │
│     ├─ recintoId?: UUID                                         │
│     ├─ activo: boolean                                          │
│     ├─ creadoEn: Date                                           │
│     └─ actualizadoEn: Date                                      │
│                                                                   │
│  DTOs                                                            │
│  └─ PersonalTerritorialDTO                                      │
│     ├─ CrearPersonalDTO                                         │
│     └─ ActualizarPersonalDTO                                    │
│                                                                   │
│  Esquemas de Validación                                         │
│  └─ personalSchemas.ts (Zod)                                    │
│     ├─ crearPersonalSchema                                      │
│     └─ actualizarPersonalSchema                                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ implementa
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 INFRAESTRUCTURA (Infrastructure)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  SupabasePersonalTerritorialDataSource                          │
│  ├─ Conexión: Supabase Client                                   │
│  │                                                               │
│  ├─ Métodos:                                                    │
│  │  ├─ obtenerSubordinados()                                    │
│  │  │  └─ Query a tabla: personal_territorial                   │
│  │  │  └─ Filtrado por rol jerárquico                           │
│  │  │  └─ COORDINADOR_PROVINCIAL → COORDINADOR_RECINTO          │
│  │  │  └─ COORDINADOR_RECINTO → VEEDOR                          │
│  │  │  └─ VEEDOR → [] (sin subordinados)                        │
│  │  │                                                            │
│  │  ├─ obtenerPorId(id)                                         │
│  │  │  └─ Query simple por ID                                   │
│  │  │                                                            │
│  │  ├─ crear(DTO)                                               │
│  │  │  └─ Invoca Edge Function: crear-usuario-subordinado       │
│  │  │  └─ Validaciones en servidor:                             │
│  │  │     • Jerarquía de roles                                   │
│  │  │     • Permisos de creación                                 │
│  │  │  └─ Crea usuario en auth.users                            │
│  │  │  └─ Inserta en personal_territorial                       │
│  │  │                                                            │
│  │  ├─ actualizar(id, DTO)                                      │
│  │  │  └─ Update: nombres_completos, telefono, updated_at       │
│  │  │  └─ Query con RLS policies                                │
│  │  │                                                            │
│  │  ├─ eliminar(id)                                             │
│  │  │  └─ Soft delete: activo = false                           │
│  │  │  └─ Query con RLS policies                                │
│  │  │                                                            │
│  │  └─ puedeGestionar(usuarioId)                                │
│  │     └─ Validar roles jerárquicos                             │
│  │                                                               │
│  Supabase Tabla: personal_territorial                           │
│  ├─ id (UUID, PK, FK auth.users)                                │
│  ├─ cedula (VARCHAR 10, UNIQUE)                                 │
│  ├─ nombres_completos (VARCHAR 255)                             │
│  ├─ email (VARCHAR 255, UNIQUE)                                 │
│  ├─ telefono (VARCHAR 15)                                       │
│  ├─ rol (COORDINADOR_PROVINCIAL | COORDINADOR_RECINTO | VEEDOR) │
│  ├─ provincia_id (UUID, FK provincia)                           │
│  ├─ recinto_id (UUID, FK recinto)                               │
│  ├─ activo (BOOLEAN, DEFAULT true)                              │
│  ├─ created_at (TIMESTAMP)                                      │
│  └─ updated_at (TIMESTAMP)                                      │
│                                                                   │
│  Supabase Edge Function                                         │
│  └─ crear-usuario-subordinado                                   │
│     ├─ Autenticación: JWT verificado                            │
│     ├─ Validaciones:                                            │
│     │  • COORDINADOR_PROVINCIAL solo crea COORDINADOR_RECINTO   │
│     │  • COORDINADOR_RECINTO solo crea VEEDOR                   │
│     │  • VEEDOR no puede crear nada                              │
│     ├─ Acciones:                                                │
│     │  • Crea usuario en auth.users                              │
│     │  • Inserta en personal_territorial                        │
│     │  • Retorna DTO creado                                      │
│     └─ RLS Policies:                                            │
│        • Lectura: Por rol jerárquico                             │
│        • Escritura: Solo autenticados                            │
│        • Actualización: Owner o superior                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos - Feature F5 (CRUD Usuarios)

### Caso: Crear Nuevo Usuario

```
┌─────────────────────────────────────────────────────────────────┐
│                       1. UI Interaction                          │
│                   GestionPersonalScreen                         │
│                  Presiona: "Crear nuevo..."                      │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    2. Bottom Sheet Abierto                       │
│              CrearPersonalBottomSheet.tsx                       │
│           - Formulario con React Hook Form                      │
│           - Validación Zod (tipos, regex, etc.)                 │
│           - Usuario ingresa datos                                │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   3. Submit Formulario                           │
│         const datos: CrearPersonalDTO = {...}                   │
│      dispatch(crearPersonal(datos))                             │
│               (Redux Async Thunk)                                │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 4. Thunk: crearPersonal()                        │
│           extra.personalRepository.crear(datos)                 │
│                                                                   │
│          personalSlice.ts:                                      │
│          ├─ Estado: creando = true                              │
│          ├─ Llama al repositorio                                │
│          └─ Espera respuesta                                    │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          5. Data Layer: PersonalTerritorialRepository           │
│                                                                   │
│          repository.crear(datos)                                │
│          ├─ Llama al DataSource                                 │
│          └─ Espera DTO                                          │
│                                                                   │
│          repository.mapper.toDomain(dto)                        │
│          └─ Convierte DTO → Entidad                             │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│   6. Infrastructure: SupabasePersonalTerritorialDataSource      │
│                                                                   │
│   dataSource.crear(datos)                                       │
│   ├─ Obtiene currentUserId de sesión Supabase                   │
│   ├─ Invoca Edge Function:                                      │
│   │  supabase.functions.invoke('crear-usuario-subordinado')    │
│   │  {                                                           │
│   │    cedula, nombres_completos, telefono,                     │
│   │    email, password, rol, recinto_id                         │
│   │  }                                                           │
│   │                                                              │
│   │  Edge Function (Servidor):                                  │
│   │  ├─ Verifica JWT del usuario                                │
│   │  ├─ Valida jerarquía de roles                               │
│   │  ├─ Crea usuario en auth.users                              │
│   │  ├─ Inserta en personal_territorial                         │
│   │  └─ Retorna: PersonalTerritorialDTO                         │
│   │                                                              │
│   └─ Captura DTO del servidor                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          7. Data Layer: Mapper convierte DTO → Entidad          │
│                                                                   │
│          const entidad = mapper.toDomain(dtoDelServidor)        │
│          └─ Retorna PersonalTerritorial                         │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│             8. Redux: Thunk Fulfilled (Éxito)                   │
│                                                                   │
│          personalSlice.ts:                                      │
│          ├─ Estado: creando = false                             │
│          ├─ Estado: ultimoCreado = entidad                      │
│          ├─ Estado: error = null                                │
│          └─ Trigger: render de GestionPersonalScreen            │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          9. UI: Actualizar y Mostrar Feedback                   │
│                                                                   │
│          GestionPersonalScreen:                                 │
│          ├─ Cierra CrearPersonalBottomSheet                     │
│          ├─ Recarga lista de subordinados:                      │
│          │  dispatch(cargarSubordinados())                      │
│          └─ Muestra FeedbackBottomSheet con Lottie             │
│             "✅ Usuario creado exitosamente"                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Jerarquía de Roles

```
╔═════════════════════════════════════════════════════════════╗
║                 COORDINADOR_PROVINCIAL                      ║
║ (Gestiona toda la provincia)                                ║
║ ├─ Crea/Edita/Elimina: COORDINADOR_RECINTO                  ║
║ └─ Ve: COORDINADOR_RECINTO de su provincia                  ║
╚═════════════════════════════════════════════════════════════╝
              ▲                 ▲                 ▲
              │                 │                 │
              └─────────────────┴─────────────────┘
                   (1 por provincia)
                        ▼ ▼ ▼
              ┌────────────────────────────┐
              │  COORDINADOR_RECINTO       │
              │  (Gestiona su recinto)     │
              │  ├─ Crea/Edita/Elimina:    │
              │  │  VEEDOR                 │
              │  └─ Ve: VEEDOR de su       │
              │     recinto                │
              └────────────────────────────┘
                   ▼ ▼ ▼ ▼ ▼
         ┌────────────────────────────┐
         │      VEEDOR                │
         │  (Registra actas)          │
         │  ├─ Crea/Edita/Elimina:    │
         │  │  Nada (no gestiona)      │
         │  └─ Ve: Solo su perfil      │
         └────────────────────────────┘
```

---

## 🔐 Validaciones de Seguridad

```
┌──────────────────────────────────────┐
│   CLIENTE (React Native / Expo)      │
├──────────────────────────────────────┤
│ ✅ React Hook Form                   │
│    └─ Captura datos del formulario   │
│                                      │
│ ✅ Zod Validations                   │
│    ├─ Tipos de datos                │
│    ├─ Regex (cédula, teléfono)      │
│    ├─ Longitud mínima/máxima        │
│    └─ Email RFC5322                 │
│                                      │
│ ✅ Lógica de negocio                │
│    ├─ Verificar rol del usuario     │
│    └─ No permitir crear sin rol     │
└──────────────────────────────────────┘
              ▼ HTTPS POST
┌──────────────────────────────────────┐
│   SERVIDOR (Supabase Edge Function)  │
├──────────────────────────────────────┤
│ ✅ JWT Verificación                  │
│    └─ Token debe ser válido          │
│                                      │
│ ✅ Jerarquía de Roles                │
│    ├─ COORDINADOR_PROVINCIAL → ORyR │
│    └─ COORDINADOR_RECINTO → VEEDOR  │
│                                      │
│ ✅ Lógica Estricta                   │
│    ├─ Crear usuario auth.users       │
│    ├─ Insertar en personal_territorial│
│    └─ RLS policies                   │
│                                      │
│ ✅ Database Row Level Security       │
│    ├─ Lectura por rol jerárquico     │
│    ├─ Escritura: solo autenticados   │
│    └─ Actualización: owner + superior │
└──────────────────────────────────────┘
```

---

## 🚀 Redux State Management

```
Redux Store (personalSlice)
├── State
│   ├─ subordinados: PersonalTerritorial[]
│   ├─ cargando: boolean
│   ├─ error: string | null
│   ├─ creando: boolean
│   ├─ actualizando: string | null    (ID del usuario)
│   ├─ eliminando: string | null      (ID del usuario)
│   └─ ultimoCreado: PersonalTerritorial | null
│
├── Async Thunks (Creadores de acciones)
│   ├─ cargarSubordinados()
│   │  └─ Type: 'personal/cargarSubordinados/fulfilled'
│   ├─ crearPersonal(DTO)
│   │  └─ Type: 'personal/crear/fulfilled'
│   ├─ actualizarPersonal(DTO)
│   │  └─ Type: 'personal/actualizar/fulfilled'
│   └─ eliminarPersonal(id)
│      └─ Type: 'personal/eliminar/fulfilled'
│
├── Reducers
│   ├─ extraReducers (thunks)
│   │  ├─ Pending: Establece flags cargando = true
│   │  ├─ Fulfilled: Actualiza estado + limpia error
│   │  └─ Rejected: Establece error message
│   │
│   └─ Actions (sincrónicas)
│      ├─ limpiarError(): error = null
│      └─ limpiarUltimoCreado(): ultimoCreado = null
│
└── Selectors (useAppSelector)
    ├─ state.personal.subordinados
    ├─ state.personal.cargando
    ├─ state.personal.error
    └─ state.personal.creando
```

---

## 📲 Componentes UI Interacción

```
GestionPersonalScreen (Principal)
├─ Header
│  ├─ Botón: "Volver"
│  └─ Título: "Gestionar Personal"
│
├─ Lista de Subordinados
│  └─ ForEach subordinado:
│     ├─ Nombre
│     ├─ Email
│     ├─ Teléfono
│     ├─ Botón: "✏️ Editar información"
│     │  └─ Abre EditarNombreBottomSheet
│     └─ Botón: "🗑️ Desactivar acceso"
│        └─ Abre FeedbackBottomSheet de confirmación
│
├─ FloatingActionButton (FAB)
│  └─ Presionar → Abre CrearPersonalBottomSheet
│
├─ FeedbackBottomSheet (Éxito/Error)
│  ├─ Lottie Animation (✅ o ❌)
│  ├─ Mensaje descriptivo
│  └─ Botón: "Aceptar"
│
└─ useFocusEffect
   └─ Recargar subordinados al enfocar pantalla


CrearPersonalBottomSheet (Modal de Creación)
├─ Encabezado: "Crear nuevo [COORDINADOR_RECINTO|VEEDOR]"
│
├─ Formulario (React Hook Form + Zod)
│  ├─ Nombres Completos*
│  │  └─ Validar: No vacío, min 3, max 255 chars
│  ├─ Cédula*
│  │  └─ Validar: 8-10 dígitos, única
│  ├─ Email*
│  │  └─ Validar: RFC5322, única
│  ├─ Teléfono
│  │  └─ Validar: 7-15 dígitos
│  ├─ Contraseña*
│  │  ├─ Mostrar: 10+ chars, mayús, minús, número, símbolo
│  │  ├─ Toggle: Ojo para ver/ocultar
│  │  └─ Validar: Regex completo
│  └─ [Si es VEEDOR] Recinto*
│     └─ Select: Lista de recintos disponibles
│
├─ Acciones
│  ├─ Botón: "Cancelar"
│  │  └─ dispatch(limpiarError()) + cerrar
│  └─ Botón: "Crear"
│     ├─ Validar con Zod
│     ├─ dispatch(crearPersonal(datos))
│     ├─ Mostrar spinner
│     └─ En éxito: Cerrar + mostrar feedback


EditarNombreBottomSheet (Modal de Autoedición)
├─ Encabezado: "Editar mi información"
│
├─ Formulario (React Hook Form + Zod)
│  ├─ Nombres Completos
│  │  └─ Valor actual: nombres_completos del usuario
│  └─ Teléfono
│     └─ Valor actual: telefono del usuario
│
├─ Acciones
│  ├─ Botón: "Cancelar"
│  │  └─ Cerrar sin guardar
│  └─ Botón: "Guardar Cambios"
│     ├─ Validar con Zod
│     ├─ dispatch(actualizarPersonal(datos))
│     ├─ Mostrar spinner
│     └─ En éxito: Cerrar + mostrar feedback
│        + Recargar datos
```

---

## 📊 Validaciones Zod

```
crearPersonalSchema
├─ cedula
│  ├─ Type: string
│  ├─ min: 8, max: 10
│  └─ Regex: /^\d{8,10}$/
│
├─ nombres_completos
│  ├─ Type: string
│  ├─ min: 3, max: 255
│  └─ Trim
│
├─ email
│  ├─ Type: string
│  └─ Email RFC5322
│
├─ telefono (opcional)
│  ├─ Type: string | undefined
│  └─ Regex: /^[\d\-\+\s()]{7,15}$/
│
├─ password
│  ├─ Type: string
│  ├─ min: 10
│  ├─ Regex: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*])[\w!@#$%^&*]{10,}$/
│  │          ↑         ↑          ↑      ↑
│  │       Mayús      minús      número  símbolo
│  └─ Error: "10+ caracteres, incluir mayúsculas, minúsculas, números y símbolos"
│
├─ rol
│  ├─ Type: enum
│  └─ Valores: 'COORDINADOR_PROVINCIAL' | 'COORDINADOR_RECINTO' | 'VEEDOR'
│
└─ recintoId (opcional)
   ├─ Type: UUID | null
   └─ Requerido si rol === 'VEEDOR'


actualizarPersonalSchema
├─ nombres_completos (opcional)
│  ├─ Type: string | undefined
│  └─ min: 3, max: 255
│
├─ telefono (opcional)
│  └─ Regex: /^[\d\-\+\s()]{7,15}$/
│
└─ Refine: Al menos uno de los campos debe estar presente
   └─ Error: "Debe proporcionar al menos un campo a actualizar"
```

---

## 🔄 Flujo de Datos Redux

```
Component:
  onClick={() => dispatch(cargarSubordinados())}
           ▼
personalSlice.ts:
  extraReducers[cargarSubordinados.pending]:
    state.cargando = true
    state.error = null
           ▼
  thunk execution:
    extra.personalRepository.obtenerSubordinados()
           ▼
    Data Layer:
      repository.obtenerSubordinados()
        └─ dataSource.obtenerSubordinados()
           ▼
    Infrastructure:
      SELECT * FROM personal_territorial WHERE...
           ▼
    Data Layer:
      mapper.toDomainArray(dtos)
           ▼
  thunk returns: PersonalTerritorial[]
           ▼
personalSlice.ts:
  extraReducers[cargarSubordinados.fulfilled]:
    state.subordinados = action.payload
    state.cargando = false
    state.error = null
           ▼
Redux re-render:
  Component recibe: state.personal.subordinados
  Component recibe: state.personal.cargando
           ▼
UI: Renderiza lista de subordinados
```

---

## 📄 Resumen de Conexiones

| Capa | Componente | Responsabilidad |
|------|-----------|-----------------|
| **Presentación** | GestionPersonalScreen | Renderizar UI principal |
| | EditarNombreBottomSheet | Formulario autoedición |
| | CrearPersonalBottomSheet | Formulario creación |
| | personalSlice (Redux) | Gestionar estado global |
| **Datos** | PersonalTerritorialRepository | Coordinar operaciones |
| | PersonalTerritorialMapper | Convertir DTO ↔ Entidad |
| **Dominio** | PersonalTerritorial (entidad) | Lógica de negocio |
| | personalSchemas (Zod) | Validaciones |
| | IPersonalTerritorialRepository | Contrato de acceso |
| **Infraestructura** | SupabasePersonalTerritorialDataSource | Acceso BD |
| | Edge Function | Crear usuarios (servidor) |
| | personal_territorial (tabla) | Almacenamiento BD |

---

*Diagrama de Arquitectura - Feature-Driven Development (FDD)*  
*Clean Architecture con 4 capas: Presentación → Datos → Dominio → Infraestructura*  
*Validación doble: Cliente (React Hook Form + Zod) + Servidor (Edge Function + RLS)*
