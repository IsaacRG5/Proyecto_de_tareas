# Historia de Usuario - Proyecto Kanban de Tareas

## 📌 Nombre del Proyecto

**RiwiFlow**

---

# 🎯 Objetivo General

Como usuario del sistema, quiero administrar tareas mediante un tablero Kanban para organizar el flujo de trabajo según su estado y rol dentro de la aplicación.

---

# 👥 Roles del Sistema

| Rol   | Descripción                                                              |
| ----- | ------------------------------------------------------------------------ |
| Admin | Puede crear, editar y visualizar todas las tareas                        |
| Coder | Puede visualizar todas las tareas y editar únicamente las asignadas a él |

---

# 🧾 Requerimientos Funcionales

## 🔐 Autenticación

### HU-01 — Inicio de sesión

**Como** usuario registrado
**Quiero** iniciar sesión en la aplicación
**Para** acceder a las funcionalidades según mi rol.

### Criterios de aceptación

- El usuario debe ingresar:
  - email
  - password

- El sistema debe validar las credenciales usando `json-server`.
- Si las credenciales son correctas:
  - se debe almacenar la sesión
  - se debe redireccionar al dashboard principal

- Si las credenciales son incorrectas:
  - se debe mostrar un mensaje de error

---

## 🖥️ Aplicación SPA

### HU-02 — Navegación sin recarga

**Como** usuario
**Quiero** navegar entre las vistas sin recargar la página
**Para** tener una mejor experiencia de usuario.

### Criterios de aceptación

- El proyecto debe desarrollarse como una SPA (Single Page Application).
- Debe manejar rutas internas.
- La navegación no debe recargar completamente el navegador.

---

# 📋 Gestión de Tareas

## HU-03 — Crear tareas (Admin)

**Como** administrador
**Quiero** crear tareas
**Para** asignarlas a los coders.

### Criterios de aceptación

- Solo usuarios con rol `admin` pueden crear tareas.
- La tarea debe contener:
  - título
  - descripción
  - estado
  - usuario asignado

- El estado inicial por defecto debe ser `todo`.

---

## HU-04 — Visualizar tareas

**Como** usuario autenticado
**Quiero** visualizar todas las tareas
**Para** conocer el estado del proyecto.

### Criterios de aceptación

- Tanto `admin` como `coder` pueden visualizar todas las tareas.
- Las tareas deben mostrarse organizadas por columnas:
  - Todo
  - In Progress
  - In Review
  - Done

---

## HU-05 — Editar tareas (Admin)

**Como** administrador
**Quiero** editar cualquier tarea
**Para** actualizar información o cambiar estados.

### Criterios de aceptación

- El admin puede:
  - editar título
  - editar descripción
  - cambiar estado
  - cambiar usuario asignado

---

## HU-06 — Editar tareas asignadas (Coder)

**Como** coder
**Quiero** editar únicamente las tareas asignadas a mí
**Para** actualizar el progreso de mi trabajo.

### Criterios de aceptación

- El coder NO puede crear tareas.
- El coder solo puede editar tareas donde:

- El coder puede:
  - cambiar estado
  - editar descripción

- El coder NO puede:
  - editar tareas de otros usuarios
  - eliminar tareas
  - crear tareas

---

# 🔄 Estados del Kanban

## HU-07 — Flujo de estados

**Como** usuario
**Quiero** clasificar tareas por estado
**Para** visualizar el progreso del trabajo.

### Estados requeridos

- `todo`
- `in progress`
- `in review`
- `done`

### Criterios de aceptación

- Cada tarea debe pertenecer a un único estado.
- Las tareas deben visualizarse en la columna correspondiente.
- El estado debe poder actualizarse mediante edición.

---

# 🗄️ Persistencia de Datos

## HU-08 — Uso de JSON Server

**Como** desarrollador
**Quiero** usar `json-server`
**Para** simular una API REST.

### Criterios de aceptación

- Debe utilizarse `json-server`.
- La estructura del archivo `db.json` debe mantenerse exactamente así:

```json
{
  "users": [
    {
      "id": 1,
      "name": "",
      "email": "",
      "password": "",
      "role": "admin"
    },
    {
      "id": 2,
      "name": "",
      "email": "",
      "password": "",
      "role": "coder"
    }
  ],
  "tasks": [
    {
      "id": 1,
      "title": "",
      "description": "",
      "status": "pending",
      "userId": 2
    },
    {
      "id": 2,
      "title": "",
      "description": "",
      "status": "done",
      "userId": 2
    }
  ]
}
```

---

# 🎨 Requerimientos Técnicos

## Frontend

- SPA
- Manejo de rutas
- Manejo de estado
- Consumo de API REST
- Protección de rutas por autenticación y rol

---

# ✅ Entregables

- Proyecto funcional en ingles
- Código organizado y en ingles
- Archivo `db.json`
- README con instrucciones de ejecución
- Evidencia del manejo de roles
- Evidencia del funcionamiento del Kanban
