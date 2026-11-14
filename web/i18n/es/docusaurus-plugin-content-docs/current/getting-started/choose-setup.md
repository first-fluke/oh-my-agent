---
title: Elegir una configuración
description: Carga una skill de OMA para una tarea, selecciona un preset de dominio o instala el plugin de Claude Code con sus dependencias de runtime.
---

# Elegir una configuración

Elige el punto de entrada de la tarea que quieres completar.

| Necesidad | Punto de entrada | Qué configura |
|---|---|---|
| Una tarea concreta en tu agente actual | [Cargar una skill](#load-one-skill) | Instrucciones y archivos de apoyo en un directorio temporal |
| Hooks de proyecto, agentes especialistas y workflows | [Instalar un preset de skills](#install-a-skill-preset) | Integración del runtime de OMA con las skills seleccionadas |
| Instalación del marketplace de Claude Code | [Instalar el plugin](#install-the-claude-code-plugin) | El plugin de OMA y el arranque del proyecto |
| Instalación del paquete de Copilot CLI, Kiro, Qwen Code, Hermes o Codex | [Paquete Agent Plugins](../guide/vendor-capabilities.md#agent-plugins-package) | Skills y servidores MCP para cada host; Copilot también recibe agentes, comandos, reglas y el hook de arranque |

## Cargar una skill {#load-one-skill}

Pide a tu agente de código que ejecute el comando de tu tarea y lea las instrucciones que devuelve. `skills use` imprime las instrucciones y la ruta de su directorio de apoyo. No lanza otro agente ni ejecuta el instalador de OMA.

| Tarea | Comando | Primera petición |
|---|---|---|
| Diseño de una UI de administración o revisión de una UI existente | `bunx skills use first-fluke/oh-my-agent@oma-design` | Revisa la jerarquía, la densidad de la tabla y los estados vacíos de nuestra página de administración. |
| Un bug reproducible | `bunx skills use first-fluke/oh-my-agent@oma-debug` | Reproduce este fallo, corrige su causa y ejecuta la comprobación pertinente. |
| Una decisión de arquitectura | `bunx skills use first-fluke/oh-my-agent@oma-architecture` | Compara mantener este trabajo en la API con moverlo a un worker. |

La carpeta seleccionada incluye sus referencias de instrucciones compartidas. Las dependencias fuera de esa carpeta siguen siendo explícitas: otra skill de dominio, reglas del proyecto, operaciones de la CLI, herramientas de navegador o un motor externo pueden seguir haciendo falta. Lee las dependencias de la skill seleccionada para la operación pedida. Instala el runtime cuando la tarea necesite sus hooks o su ejecución gestionada.

Para el trabajo de diseño, `oma-design` selecciona Interface Design para la dirección de interfaces de administración y de producto, Taste para otra dirección artística web e Impeccable para la crítica, la auditoría y el pulido de una UI existente. El stack del proyecto y `DESIGN.md` siguen siendo los contratos de implementación y de diseño.

## Instalar un preset de skills {#install-a-skill-preset}

Instala la CLI una vez y después selecciona las skills del proyecto:

```bash
bun install --global oh-my-agent
oma install --preset frontend --yes
oma doctor
```

Una instalación de CLI existente puede empezar por el segundo comando. Usa `oma install --help` para los nombres de presets y las opciones de proveedores. El [instalador de arranque](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#method-1-one-liner-install) también prepara las dependencias del runtime antes de la configuración interactiva.

| Preset | Primera tarea | Ejemplos de workflows aplicables |
|---|---|---|
| `frontend` | Planifica una página de ajustes y después implementa su formulario | `/plan`, `/design`, `/review`, `/debug` |
| `backend` | Planifica un endpoint de API autenticado | `/plan`, `/architecture`, `/review`, `/debug` |
| `research` | Encuentra artículos y compara su evidencia | Pide una búsqueda bibliográfica con citas |
| `all` | Coordina una funcionalidad entre UI, API y datos | `/orchestrate`, `/work`, `/ultrawork`, `/ralph` |

`--preset` acepta los [presets con nombre](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#presets). Un nombre desconocido, un valor vacío o `custom` se rechaza antes de la instalación. Para seleccionar skills individuales, ejecuta `oma install` de forma interactiva y elige Custom. Sin `--preset`, la configuración desatendida con `--yes` o CI selecciona `all`.

El preset de frontend selecciona ocho skills. Los presets seleccionan contenido de skills; el instalador sigue configurando los archivos compartidos, todas las definiciones de workflows y agentes, los hooks y los proveedores. Algunos workflows necesitan skills fuera de un preset de dominio. Comprueba las [dependencias de los workflows](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#workflows-that-need-skills-outside-a-preset) antes de usarlos, o selecciona `all` para todos los workflows. Un preset más pequeño en una instalación existente no elimina las demás skills.

Las elecciones de proveedor son independientes de los presets. Por ejemplo, añade `--semantic-memory none` cuando el proyecto no necesite un servicio de memoria semántica. Consulta los [efectos de la instalación](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#what-the-installer-also-does-by-default) para los demás archivos e integraciones que configura el runtime.

El resumen de la instalación enumera las skills seleccionadas y comprueba los manifiestos de skills presentes, incluidas las skills conservadas. Informa de las referencias estáticas de workflows y agentes, incluidas las ramas condicionales, como manifiestos de skills referenciados. Ejecuta `oma doctor` para reparar las entradas ausentes o ilegibles que necesite tu tarea. Estas comprobaciones no verifican el contenido de los recursos, las herramientas, los proveedores, las credenciales ni la ejecución.

## Instalar el plugin de Claude Code {#install-the-claude-code-plugin}

Ejecuta estos comandos dentro de Claude Code:

```text
/plugin marketplace add first-fluke/oh-my-agent
/plugin install oma@oh-my-agent
```

Elige `oma-frontend@oh-my-agent`, `oma-security@oh-my-agent` u `oma-research@oh-my-agent` para un plugin de dominio. La entrada completa `oma` conserva la selección completa de skills. Las entradas de dominio arrancan su preset correspondiente.

El hook de inicio de sesión del plugin aprovisiona la CLI cuando hace falta y ejecuta `oma install --yes` para el proyecto actual. Esta ruta realiza la configuración del runtime. Su recibo de éxito pertenece a ese proyecto, y los hooks de eventos del plugin usan la CLI instalada. Los hooks del plugin requieren Bash, también en Windows. El arranque tiene un tiempo de espera de 600 segundos; los fallos informan de los pasos de configuración manual y conservan el log del proyecto en `.agents/state/plugin-bootstrap.last-error.log`. Un recibo se reutiliza solo después de que pasen las comprobaciones de versión de la CLI, de configuración del proyecto y de hooks. Reinicia la sesión cuando el arranque informe de que ha terminado.

Para las elecciones de configuración y de dependencias durante la puesta en marcha, usa `oma install` directamente. El arranque desatendido del plugin completo usa el preset de skills `all`; cada plugin de dominio pasa su preset seleccionado. Un preset más pequeño conserva las demás skills ya instaladas en el proyecto.

## Comprueba el resultado

Con una skill cargada, confirma que el agente leyó las instrucciones seleccionadas e informa de las comprobaciones reales de la tarea. Con una instalación del runtime, ejecuta `oma doctor` y prueba la primera petición de tu preset. Las advertencias de proveedores de doctor importan cuando la tarea pedida usa ese proveedor.
