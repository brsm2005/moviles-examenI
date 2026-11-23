# ADR-07: Diseño Visual, Navegación por Rol y Retroalimentación de Usuario

## Requerimientos Relacionados
* **Funcionales:** RF-01, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RF-11, RF-12, RF-13
* **No Funcionales:** RNF-04
* **Supuestos:** S-06

## Contexto
Muchos veedores son adultos mayores y tienen poca experiencia tecnológica; debe existir una interfaz con feedback visual claro para acciones en proceso, exitosas, fallidas y validaciones usando `Lottie` y `Reanimated`, evitando modales genéricos (`Alert.alert`) y asegurando una navegación intuitiva diferenciada por rol.

## Alternativas Consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| :--- | :--- | :--- | :--- |
| **React Navigation, `@gorhom/bottom-sheet`, `lottie-react-native`, `react-native-reanimated`, Sistema de Diseño propio** | Bryan Rodrigo Salvador Martínez | Reemplazo total de alertas nativas mediante hojas interactivas de `@gorhom/bottom-sheet` para confirmar actas, mostrar errores de cuadre matemático y visualizar el progreso de subida, animaciones vectoriales y gestos fluidos. | `@gorhom/bottom-sheet` depende de `react-native-gesture-handler` y `react-native-reanimated`, por lo que requiere envolver la app en `<GestureHandlerRootView>` correctamente. |
| **Uniwind + Tailwind CSS v4** | Edwin Efraín Chusín Enríquez | Diseñado para Tailwind v4, configuración moderna mediante Metro, mejor integración con Expo y experiencia de desarrollo ágil mediante utilidades `className`. | Requiere configurar `metro.config.js` y `global.css` para Tailwind v4. |
| **Uniwind + Lottie** | Emily Juliet Pazmiño Mora | Se enfoca en consistencia visual y escalabilidad de componentes junto con retroalimentación animada clara. | Debe complementarse con componentes de navegación y hojas inferiores interactivas. |

## Decisión
**React Navigation, `@gorhom/bottom-sheet`, `lottie-react-native`, `react-native-reanimated` y Uniwind (Tailwind CSS v4).**

## Consecuencias
* Permite construir una interfaz moderna, altamente legible para adultos mayores y con retroalimentación visual inmediata (animaciones Lottie y paneles BottomSheet sin `Alert.alert`).
* Obliga a envolver la raíz de la aplicación (`App.tsx`) en `<GestureHandlerRootView>` y `<Provider store={store}>`, además de configurar `withUniwindConfig` en `metro.config.js`.