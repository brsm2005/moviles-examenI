# ADR-03: Arquitectura de Software, Gestión de Estado Global y Validación de Formularios

## Requerimientos Relacionados
* **Funcionales:** RF-02, RF-07, RF-09, RF-10, RF-11, RF-12
* **No Funcionales:** RNF-04
* **Supuestos:** S-01

## Contexto
El proyecto exige organizar el código bajo *Clean Architecture* manteniendo coherencia sobre la separación de responsabilidades y asegurar fluidez en dispositivos Android. Así como mantener un control estricto dentro de los formularios para las validaciones tanto en la creación de usuarios (cédula ecuatoriana, correo, teléfono) como en las reglas aritméticas de las actas (`S-01`).

## Alternativas Consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **Clean Architecture (Domain – Data – Infrastructure – Presentation), Zustand, React Hook Form, Zod** | Bryan Rodrigo Salvador Martínez | Desacopla reglas electorales en esquemas Zod reutilizables entre dominio y presentación. React Hook Form evita *re-renders* por cada pulsación de tecla en formularios largos y Zustand gestiona el estado global ligero. | Menor estandarización estructural para rastrear flujos de acciones complejas entre múltiples módulos en equipo. |
| **Clean Architecture (Domain – Data – Infrastructure – Presentation), Redux Toolkit, React Hook Form, Zod** | Edwin Efraín Chusín Enríquez | Alto nivel de estandarización, herramientas maduras, flujo predecible mediante *slices* y *thunks* asíncronos, y trazabilidad clara de transiciones de estado. | Pide que la implementación sea más estricta para estados intermedios y tipado de *slices*. |
| **Clean Architecture** | Emily Juliet Pazmiño Mora | Separa responsabilidades y facilita el mantenimiento y pruebas de cada capa del sistema. | Requiere definir las librerías complementarias para estado global y validación de formularios. |

## Decisión
**Clean Architecture (`domain`, `data`, `infrastructure`, `presentation`), con Redux Toolkit (`@reduxjs/toolkit` + `react-redux`), React Hook Form y Zod para el manejo de estados y formularios.**

## Consecuencias
* Se gana estandarización, trazabilidad predecible del estado global (`authSlice`, `territorioSlice`, `historialSlice`) y validación aritmética compartida en `Zod`, pero es obligatorio regirse a su implementación estricta y bloquear importaciones de Redux/UI dentro de `src/domain/`.