from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid
import hashlib

app = FastAPI(title="MES Production Execution System")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=False,  # Disable credentials to allow wildcard
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

security = HTTPBearer()

class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    WORKER = "worker"
    INSPECTOR = "inspector"

class MaterialType(str, Enum):
    RAW_MATERIAL = "raw_material"
    SEMI_FINISHED = "semi_finished"
    FINISHED_GOOD = "finished_good"

class ProductionLineStatus(str, Enum):
    IDLE = "idle"
    BUSY = "busy"

class WorkOrderStatus(str, Enum):
    CREATED = "created"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class TaskStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

users_db: Dict[str, Dict] = {}
materials_db: Dict[str, Dict] = {}
production_lines_db: Dict[str, Dict] = {}
routings_db: Dict[str, Dict] = {}
boms_db: Dict[str, Dict] = {}
work_orders_db: Dict[str, Dict] = {}
production_tasks_db: Dict[str, Dict] = {}
inspection_tasks_db: Dict[str, Dict] = {}
sessions_db: Dict[str, Dict] = {}

def create_default_admin():
    if "admin" not in users_db:
        admin_user = {
            "id": "admin",
            "username": "admin", 
            "password": hashlib.sha256("admin".encode()).hexdigest(),
            "role": "admin",
            "name": "系统管理员"
        }
        users_db["admin"] = admin_user

create_default_admin()

class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole

class UserLogin(BaseModel):
    username: str
    password: str

class MaterialCreate(BaseModel):
    name: str
    type: MaterialType
    initial_stock: int

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[MaterialType] = None

class StockUpdate(BaseModel):
    quantity: int

class ProductionLineCreate(BaseModel):
    name: str

class ProductionLineUpdate(BaseModel):
    name: str

class OperationCreate(BaseModel):
    name: str
    output_material_id: str
    output_quantity: int
    requires_inspection: bool

class RoutingCreate(BaseModel):
    name: str
    finished_product_id: str
    operations: List[OperationCreate]

class BOMComponentCreate(BaseModel):
    material_id: str
    quantity: int
    operation_index: int

class BOMCreate(BaseModel):
    name: str
    routing_id: str
    components: List[BOMComponentCreate]

class WorkOrderCreate(BaseModel):
    bom_id: str
    planned_quantity: int

class ProductionTaskCreate(BaseModel):
    work_order_id: str
    operation_index: int
    planned_output: int
    production_line_id: str
    assigned_worker: str

class MaterialFeeding(BaseModel):
    material_id: str
    quantity: int

class ProductionReporting(BaseModel):
    output_quantity: int

class InspectionReporting(BaseModel):
    qualified_quantity: int
    unqualified_quantity: int

class InspectionAssignment(BaseModel):
    inspector_username: str

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def generate_id() -> str:
    return str(uuid.uuid4())

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    if token not in sessions_db:
        raise HTTPException(status_code=401, detail="Invalid token")
    return sessions_db[token]["user"]

def require_role(required_roles: List[UserRole]):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in required_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/api/auth/login")
async def login(user_login: UserLogin):
    user = None
    for uid, user_data in users_db.items():
        if user_data["username"] == user_login.username:
            user = user_data
            break
    
    if not user or not verify_password(user_login.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = generate_id()
    sessions_db[token] = {"user": user, "created_at": datetime.now()}
    
    return {"token": token, "user": {"id": user["id"], "username": user["username"], "role": user["role"]}}

@app.post("/api/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    to_remove = []
    for token, session in sessions_db.items():
        if session["user"]["id"] == current_user["id"]:
            to_remove.append(token)
    for token in to_remove:
        del sessions_db[token]
    return {"message": "Logged out successfully"}

@app.get("/api/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {"id": current_user["id"], "username": current_user["username"], "role": current_user["role"]}

@app.post("/api/users")
async def create_user(user_create: UserCreate, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    for user_data in users_db.values():
        if user_data["username"] == user_create.username:
            raise HTTPException(status_code=400, detail="Username already exists")
    
    user_id = generate_id()
    users_db[user_id] = {
        "id": user_id,
        "username": user_create.username,
        "password": hash_password(user_create.password),
        "role": user_create.role,
        "created_at": datetime.now()
    }
    
    return {"id": user_id, "username": user_create.username, "role": user_create.role}

@app.get("/api/users")
async def list_users(current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    return [{"id": uid, "username": user["username"], "role": user["role"]} 
            for uid, user in users_db.items()]

@app.get("/api/workers-inspectors")
async def list_workers_inspectors(current_user: dict = Depends(require_role([UserRole.MANAGER]))):
    return [{"id": uid, "username": user["username"], "role": user["role"]} 
            for uid, user in users_db.items() 
            if user["role"] in [UserRole.WORKER, UserRole.INSPECTOR]]

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    if users_db[user_id]["id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    del users_db[user_id]
    return {"message": "User deleted successfully"}

@app.post("/api/materials")
async def create_material(material: MaterialCreate, current_user: dict = Depends(require_role([UserRole.MANAGER]))):
    material_id = generate_id()
    materials_db[material_id] = {
        "id": material_id,
        "name": material.name,
        "type": material.type,
        "stock": material.initial_stock,
        "created_at": datetime.now()
    }
    return materials_db[material_id]

@app.get("/api/materials")
async def list_materials(current_user: dict = Depends(get_current_user)):
    return list(materials_db.values())

@app.put("/api/materials/{material_id}")
async def update_material(material_id: str, material_update: MaterialUpdate, 
                         current_user: dict = Depends(require_role([UserRole.MANAGER]))):
    if material_id not in materials_db:
        raise HTTPException(status_code=404, detail="Material not found")
    
    material = materials_db[material_id]
    if material_update.name is not None:
        material["name"] = material_update.name
    if material_update.type is not None:
        material["type"] = material_update.type
    
    return material

@app.post("/api/materials/{material_id}/stock")
async def update_stock(material_id: str, stock_update: StockUpdate,
                      current_user: dict = Depends(require_role([UserRole.MANAGER]))):
    if material_id not in materials_db:
        raise HTTPException(status_code=404, detail="Material not found")
    
    materials_db[material_id]["stock"] += stock_update.quantity
    return materials_db[material_id]

@app.delete("/api/materials/{material_id}")
async def delete_material(material_id: str, current_user: dict = Depends(require_role([UserRole.MANAGER]))):
    if material_id not in materials_db:
        raise HTTPException(status_code=404, detail="Material not found")
    
    del materials_db[material_id]
    return {"message": "Material deleted successfully"}

@app.post("/api/production-lines")
async def create_production_line(line: ProductionLineCreate, 
                               current_user: dict = Depends(require_role([UserRole.MANAGER]))):
    line_id = generate_id()
    production_lines_db[line_id] = {
        "id": line_id,
        "name": line.name,
        "status": ProductionLineStatus.IDLE,
        "created_at": datetime.now()
    }
    return production_lines_db[line_id]

@app.get("/api/production-lines")
async def list_production_lines(current_user: dict = Depends(get_current_user)):
    return list(production_lines_db.values())

@app.put("/api/production-lines/{line_id}")
async def update_production_line(line_id: str, line_update: ProductionLineUpdate,
                               current_user: dict = Depends(require_role([UserRole.MANAGER]))):
    if line_id not in production_lines_db:
        raise HTTPException(status_code=404, detail="Production line not found")
    
    production_lines_db[line_id]["name"] = line_update.name
    return production_lines_db[line_id]

@app.delete("/api/production-lines/{line_id}")
async def delete_production_line(line_id: str, current_user: dict = Depends(require_role([UserRole.MANAGER]))):
    if line_id not in production_lines_db:
        raise HTTPException(status_code=404, detail="Production line not found")
    
    del production_lines_db[line_id]
    return {"message": "Production line deleted successfully"}

@app.post("/api/init-test-data")
async def init_test_data(current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    global users_db, materials_db, production_lines_db, routings_db, boms_db
    global work_orders_db, production_tasks_db, inspection_tasks_db, sessions_db
    
    admin_users = {uid: user for uid, user in users_db.items() if user["role"] == UserRole.ADMIN}
    users_db = admin_users
    
    materials_db.clear()
    production_lines_db.clear()
    routings_db.clear()
    boms_db.clear()
    work_orders_db.clear()
    production_tasks_db.clear()
    inspection_tasks_db.clear()
    
    test_users = [
        {"username": "kiwi", "password": "123456", "role": UserRole.MANAGER},
        {"username": "leen", "password": "123456", "role": UserRole.WORKER},
        {"username": "troy", "password": "123456", "role": UserRole.INSPECTOR}
    ]
    
    for user_data in test_users:
        user_id = generate_id()
        users_db[user_id] = {
            "id": user_id,
            "username": user_data["username"],
            "password": hash_password(user_data["password"]),
            "role": user_data["role"],
            "created_at": datetime.now()
        }
    
    materials = [
        {"name": "凳腿", "type": MaterialType.RAW_MATERIAL, "stock": 100},
        {"name": "凳面", "type": MaterialType.RAW_MATERIAL, "stock": 100},
        {"name": "木凳", "type": MaterialType.FINISHED_GOOD, "stock": 0}
    ]
    
    material_ids = {}
    for material_data in materials:
        material_id = generate_id()
        materials_db[material_id] = {
            "id": material_id,
            "name": material_data["name"],
            "type": material_data["type"],
            "stock": material_data["stock"],
            "created_at": datetime.now()
        }
        material_ids[material_data["name"]] = material_id
    
    line_id = generate_id()
    production_lines_db[line_id] = {
        "id": line_id,
        "name": "木凳组装线",
        "status": ProductionLineStatus.IDLE,
        "created_at": datetime.now()
    }
    
    routing_id = generate_id()
    routings_db[routing_id] = {
        "id": routing_id,
        "name": "木凳组装",
        "finished_product_id": material_ids["木凳"],
        "operations": [
            {
                "name": "组装",
                "output_material_id": material_ids["木凳"],
                "output_quantity": 1,
                "requires_inspection": True
            }
        ],
        "created_at": datetime.now()
    }
    
    bom_id = generate_id()
    boms_db[bom_id] = {
        "id": bom_id,
        "name": "木凳",
        "routing_id": routing_id,
        "components": [
            {
                "material_id": material_ids["凳腿"],
                "quantity": 3,
                "operation_index": 0
            },
            {
                "material_id": material_ids["凳面"],
                "quantity": 1,
                "operation_index": 0
            }
        ],
        "created_at": datetime.now()
    }
    
    return {
        "message": "Test data initialized successfully",
        "users": len(users_db),
        "materials": len(materials_db),
        "production_lines": len(production_lines_db),
        "routings": len(routings_db),
        "boms": len(boms_db)
    }

@app.post("/api/routings")
async def create_routing(routing: RoutingCreate, current_user: dict = Depends(require_role([UserRole.MANAGER]))):
    if routing.finished_product_id not in materials_db:
        raise HTTPException(status_code=400, detail="Finished product not found")
    
    finished_product = materials_db[routing.finished_product_id]
    if finished_product["type"] != MaterialType.FINISHED_GOOD:
        raise HTTPException(status_code=400, detail="Product must be a finished good")
    
    if not routing.operations:
        raise HTTPException(status_code=400, detail="At least one operation is required")
    
    final_op = routing.operations[-1]
    if final_op.output_material_id != routing.finished_product_id:
        raise HTTPException(status_code=400, detail="Final operation must output the finished product")
    if final_op.output_quantity != 1:
        raise HTTPException(status_code=400, detail="Final operation output quantity must be 1")
    
    for i, op in enumerate(routing.operations[:-1]):
        if op.output_material_id not in materials_db:
            raise HTTPException(status_code=400, detail=f"Operation {i+1} output material not found")
        if materials_db[op.output_material_id]["type"] != MaterialType.SEMI_FINISHED:
            raise HTTPException(status_code=400, detail=f"Operation {i+1} must output semi-finished goods")
    
    routing_id = generate_id()
    routings_db[routing_id] = {
        "id": routing_id,
        "name": routing.name,
        "finished_product_id": routing.finished_product_id,
        "operations": [
            {
                "name": op.name,
                "output_material_id": op.output_material_id,
                "output_quantity": op.output_quantity,
                "requires_inspection": op.requires_inspection
            } for op in routing.operations
        ],
        "created_at": datetime.now()
    }
    return routings_db[routing_id]

@app.get("/api/routings")
async def list_routings(current_user: dict = Depends(get_current_user)):
    return list(routings_db.values())

@app.delete("/api/routings/{routing_id}")
async def delete_routing(routing_id: str, current_user: dict = Depends(require_role([UserRole.MANAGER]))):
    if routing_id not in routings_db:
        raise HTTPException(status_code=404, detail="Routing not found")
    
    del routings_db[routing_id]
    return {"message": "Routing deleted successfully"}

@app.post("/api/boms")
async def create_bom(bom: BOMCreate, current_user: dict = Depends(require_role([UserRole.MANAGER]))):
    if bom.routing_id not in routings_db:
        raise HTTPException(status_code=400, detail="Routing not found")
    
    routing = routings_db[bom.routing_id]
    
    if not bom.components:
        raise HTTPException(status_code=400, detail="At least one component is required")
    
    first_op_materials = [c for c in bom.components if c.operation_index == 0]
    if not first_op_materials:
        raise HTTPException(status_code=400, detail="First operation must have at least one material")
    
    seen_combinations = set()
    for comp in bom.components:
        if comp.material_id not in materials_db:
            raise HTTPException(status_code=400, detail=f"Material {comp.material_id} not found")
        if materials_db[comp.material_id]["type"] != MaterialType.RAW_MATERIAL:
            raise HTTPException(status_code=400, detail="BOM components must be raw materials")
        
        if comp.operation_index >= len(routing["operations"]):
            raise HTTPException(status_code=400, detail=f"Invalid operation index {comp.operation_index}")
        
        combination = (comp.material_id, comp.operation_index)
        if combination in seen_combinations:
            raise HTTPException(status_code=400, detail="Duplicate material-operation combination")
        seen_combinations.add(combination)
    
    bom_id = generate_id()
    boms_db[bom_id] = {
        "id": bom_id,
        "name": bom.name,
        "routing_id": bom.routing_id,
        "components": [
            {
                "material_id": comp.material_id,
                "quantity": comp.quantity,
                "operation_index": comp.operation_index
            } for comp in bom.components
        ],
        "created_at": datetime.now()
    }
    return boms_db[bom_id]

@app.get("/api/boms")
async def list_boms(current_user: dict = Depends(get_current_user)):
    return list(boms_db.values())

@app.delete("/api/boms/{bom_id}")
async def delete_bom(bom_id: str, current_user: dict = Depends(require_role([UserRole.MANAGER]))):
    if bom_id not in boms_db:
        raise HTTPException(status_code=404, detail="BOM not found")
    
    del boms_db[bom_id]
    return {"message": "BOM deleted successfully"}

@app.post("/api/work-orders")
async def create_work_order(work_order: WorkOrderCreate, current_user: dict = Depends(require_role([UserRole.MANAGER]))):
    if work_order.bom_id not in boms_db:
        raise HTTPException(status_code=400, detail="BOM not found")
    
    bom = boms_db[work_order.bom_id]
    routing = routings_db[bom["routing_id"]]
    
    work_order_id = generate_id()
    work_orders_db[work_order_id] = {
        "id": work_order_id,
        "bom_id": work_order.bom_id,
        "planned_quantity": work_order.planned_quantity,
        "status": WorkOrderStatus.CREATED,
        "operations": [
            {
                "index": i,
                "name": op["name"],
                "output_material_id": op["output_material_id"],
                "planned_output": op["output_quantity"] * work_order.planned_quantity,
                "completed_output": 0,
                "requires_inspection": op["requires_inspection"],
                "assigned_tasks": 0
            } for i, op in enumerate(routing["operations"])
        ],
        "created_at": datetime.now()
    }
    
    for i, op in enumerate(routing["operations"]):
        if op["requires_inspection"]:
            inspection_id = generate_id()
            inspection_tasks_db[inspection_id] = {
                "id": inspection_id,
                "work_order_id": work_order_id,
                "operation_index": i,
                "operation_name": op["name"],
                "total_quantity": op["output_quantity"] * work_order.planned_quantity,
                "qualified_quantity": 0,
                "unqualified_quantity": 0,
                "status": TaskStatus.NOT_STARTED,
                "assigned_inspector": None,
                "created_at": datetime.now()
            }
    
    return work_orders_db[work_order_id]

@app.get("/api/work-orders")
async def list_work_orders(current_user: dict = Depends(get_current_user)):
    return list(work_orders_db.values())

@app.get("/api/work-orders/{work_order_id}")
async def get_work_order(work_order_id: str, current_user: dict = Depends(get_current_user)):
    if work_order_id not in work_orders_db:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    work_order = work_orders_db[work_order_id]
    bom = boms_db[work_order["bom_id"]]
    routing = routings_db[bom["routing_id"]]
    
    production_tasks = [task for task in production_tasks_db.values() 
                       if task["work_order_id"] == work_order_id]
    
    inspection_tasks = [task for task in inspection_tasks_db.values() 
                       if task["work_order_id"] == work_order_id]
    
    return {
        **work_order,
        "bom": bom,
        "routing": routing,
        "production_tasks": production_tasks,
        "inspection_tasks": inspection_tasks
    }

@app.post("/api/production-tasks")
async def create_production_task(task: ProductionTaskCreate, current_user: dict = Depends(require_role([UserRole.MANAGER]))):
    if task.work_order_id not in work_orders_db:
        raise HTTPException(status_code=400, detail="Work order not found")
    
    work_order = work_orders_db[task.work_order_id]
    
    if task.operation_index >= len(work_order["operations"]):
        raise HTTPException(status_code=400, detail="Invalid operation index")
    
    operation = work_order["operations"][task.operation_index]
    
    remaining_output = operation["planned_output"] - operation["assigned_tasks"]
    if task.planned_output > remaining_output:
        raise HTTPException(status_code=400, detail="Planned output exceeds remaining quantity")
    
    if task.production_line_id not in production_lines_db:
        raise HTTPException(status_code=400, detail="Production line not found")
    
    worker_exists = False
    for user in users_db.values():
        if user["username"] == task.assigned_worker and user["role"] == UserRole.WORKER:
            worker_exists = True
            break
    if not worker_exists:
        raise HTTPException(status_code=400, detail="Worker not found")
    
    task_id = generate_id()
    
    bom = boms_db[work_order["bom_id"]]
    material_requirements = []
    for component in bom["components"]:
        if component["operation_index"] == task.operation_index:
            material = materials_db[component["material_id"]]
            material_requirements.append({
                "material_id": component["material_id"],
                "material_name": material["name"],
                "required_quantity": component["quantity"] * task.planned_output,
                "fed_quantity": 0
            })
    
    production_tasks_db[task_id] = {
        "id": task_id,
        "work_order_id": task.work_order_id,
        "operation_index": task.operation_index,
        "operation_name": operation["name"],
        "planned_output": task.planned_output,
        "completed_output": 0,
        "production_line_id": task.production_line_id,
        "assigned_worker": task.assigned_worker,
        "status": TaskStatus.NOT_STARTED,
        "material_feeding": {},
        "material_requirements": material_requirements,
        "created_at": datetime.now(),
        "started_at": None,
        "completed_at": None
    }
    
    work_order["operations"][task.operation_index]["assigned_tasks"] += task.planned_output
    
    return production_tasks_db[task_id]

@app.get("/api/production-tasks")
async def list_production_tasks(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == UserRole.WORKER:
        return [task for task in production_tasks_db.values() 
                if task["assigned_worker"] == current_user["username"]]
    else:
        return list(production_tasks_db.values())

@app.post("/api/production-tasks/{task_id}/start")
async def start_production_task(task_id: str, current_user: dict = Depends(require_role([UserRole.WORKER]))):
    if task_id not in production_tasks_db:
        raise HTTPException(status_code=404, detail="Production task not found")
    
    task = production_tasks_db[task_id]
    
    if task["assigned_worker"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    
    if task["status"] != TaskStatus.NOT_STARTED:
        raise HTTPException(status_code=400, detail="Task already started")
    
    line = production_lines_db[task["production_line_id"]]
    if line["status"] != ProductionLineStatus.IDLE:
        raise HTTPException(status_code=400, detail="Production line is busy")
    
    task["status"] = TaskStatus.IN_PROGRESS
    task["started_at"] = datetime.now()
    line["status"] = ProductionLineStatus.BUSY
    
    work_order = work_orders_db[task["work_order_id"]]
    if work_order["status"] == WorkOrderStatus.CREATED:
        work_order["status"] = WorkOrderStatus.IN_PROGRESS
    
    return task

@app.post("/api/production-tasks/{task_id}/feed-material")
async def feed_material(task_id: str, feeding: MaterialFeeding, current_user: dict = Depends(require_role([UserRole.WORKER]))):
    if task_id not in production_tasks_db:
        raise HTTPException(status_code=404, detail="Production task not found")
    
    task = production_tasks_db[task_id]
    
    if task["assigned_worker"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    
    if task["status"] != TaskStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Task not in progress")
    
    work_order = work_orders_db[task["work_order_id"]]
    bom = boms_db[work_order["bom_id"]]
    
    required_quantity = 0
    for component in bom["components"]:
        if (component["material_id"] == feeding.material_id and 
            component["operation_index"] == task["operation_index"]):
            required_quantity = component["quantity"] * task["planned_output"]
            break
    
    if required_quantity == 0:
        raise HTTPException(status_code=400, detail="Material not required for this operation")
    
    current_fed = task["material_feeding"].get(feeding.material_id, 0)
    if current_fed + feeding.quantity > required_quantity:
        raise HTTPException(status_code=400, detail="Feeding quantity exceeds requirement")
    
    material = materials_db[feeding.material_id]
    if material["stock"] < feeding.quantity:
        raise HTTPException(status_code=400, detail="Insufficient material stock")
    
    task["material_feeding"][feeding.material_id] = current_fed + feeding.quantity
    material["stock"] -= feeding.quantity
    
    for req in task["material_requirements"]:
        if req["material_id"] == feeding.material_id:
            req["fed_quantity"] = current_fed + feeding.quantity
            break
    
    return task

@app.post("/api/production-tasks/{task_id}/report-production")
async def report_production(task_id: str, reporting: ProductionReporting, current_user: dict = Depends(require_role([UserRole.WORKER]))):
    if task_id not in production_tasks_db:
        raise HTTPException(status_code=404, detail="Production task not found")
    
    task = production_tasks_db[task_id]
    
    if task["assigned_worker"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    
    if task["status"] != TaskStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Task not in progress")
    
    if task["completed_output"] + reporting.output_quantity > task["planned_output"]:
        raise HTTPException(status_code=400, detail="Output quantity exceeds planned output")
    
    work_order = work_orders_db[task["work_order_id"]]
    bom = boms_db[work_order["bom_id"]]
    
    for component in bom["components"]:
        if component["operation_index"] == task["operation_index"]:
            required_per_unit = component["quantity"]
            fed_quantity = task["material_feeding"].get(component["material_id"], 0)
            max_output_from_material = fed_quantity // required_per_unit
            
            if task["completed_output"] + reporting.output_quantity > max_output_from_material:
                raise HTTPException(status_code=400, detail=f"Insufficient material {component['material_id']} fed")
    
    if task["operation_index"] > 0:
        routing = routings_db[bom["routing_id"]]
        prev_operation = routing["operations"][task["operation_index"] - 1]
        prev_material_id = prev_operation["output_material_id"]
        
        required_semi = reporting.output_quantity
        available_semi = materials_db[prev_material_id]["stock"]
        
        if required_semi > available_semi:
            raise HTTPException(status_code=400, detail="Insufficient semi-finished goods in stock")
        
        materials_db[prev_material_id]["stock"] -= required_semi
    
    task["completed_output"] += reporting.output_quantity
    work_order["operations"][task["operation_index"]]["completed_output"] += reporting.output_quantity
    
    routing = routings_db[bom["routing_id"]]
    output_material_id = routing["operations"][task["operation_index"]]["output_material_id"]
    materials_db[output_material_id]["stock"] += reporting.output_quantity
    
    if task["completed_output"] == task["planned_output"]:
        task["status"] = TaskStatus.COMPLETED
        task["completed_at"] = datetime.now()
        
        line = production_lines_db[task["production_line_id"]]
        line["status"] = ProductionLineStatus.IDLE
    
    all_operations_completed = True
    all_inspections_completed = True
    
    for operation in work_order["operations"]:
        if operation["completed_output"] < operation["planned_output"]:
            all_operations_completed = False
            break
    
    if all_operations_completed:
        for inspection in inspection_tasks_db.values():
            if (inspection["work_order_id"] == work_order["id"] and 
                inspection["status"] != TaskStatus.COMPLETED):
                all_inspections_completed = False
                break
        
        if all_inspections_completed:
            work_order["status"] = WorkOrderStatus.COMPLETED
    
    return task

@app.post("/api/inspection-tasks/{task_id}/assign")
async def assign_inspection_task(task_id: str, assignment: InspectionAssignment, current_user: dict = Depends(require_role([UserRole.MANAGER]))):
    if task_id not in inspection_tasks_db:
        raise HTTPException(status_code=404, detail="Inspection task not found")
    
    inspector_exists = False
    for user in users_db.values():
        if user["username"] == assignment.inspector_username and user["role"] == UserRole.INSPECTOR:
            inspector_exists = True
            break
    if not inspector_exists:
        raise HTTPException(status_code=400, detail="Inspector not found")
    
    inspection_tasks_db[task_id]["assigned_inspector"] = assignment.inspector_username
    return inspection_tasks_db[task_id]

@app.get("/api/inspection-tasks")
async def list_inspection_tasks(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == UserRole.INSPECTOR:
        return [task for task in inspection_tasks_db.values() 
                if task["assigned_inspector"] == current_user["username"]]
    else:
        return list(inspection_tasks_db.values())

@app.post("/api/inspection-tasks/{task_id}/start")
async def start_inspection_task(task_id: str, current_user: dict = Depends(require_role([UserRole.INSPECTOR]))):
    if task_id not in inspection_tasks_db:
        raise HTTPException(status_code=404, detail="Inspection task not found")
    
    task = inspection_tasks_db[task_id]
    
    if task["assigned_inspector"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    
    if task["status"] != TaskStatus.NOT_STARTED:
        raise HTTPException(status_code=400, detail="Task already started")
    
    task["status"] = TaskStatus.IN_PROGRESS
    task["started_at"] = datetime.now()
    
    return task

@app.post("/api/inspection-tasks/{task_id}/report-inspection")
async def report_inspection(task_id: str, reporting: InspectionReporting, current_user: dict = Depends(require_role([UserRole.INSPECTOR]))):
    if task_id not in inspection_tasks_db:
        raise HTTPException(status_code=404, detail="Inspection task not found")
    
    task = inspection_tasks_db[task_id]
    
    if task["assigned_inspector"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    
    if task["status"] != TaskStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Task not in progress")
    
    total_inspected = task["qualified_quantity"] + task["unqualified_quantity"]
    new_total = total_inspected + reporting.qualified_quantity + reporting.unqualified_quantity
    
    work_order = work_orders_db[task["work_order_id"]]
    operation = work_order["operations"][task["operation_index"]]
    
    if new_total > operation["completed_output"]:
        raise HTTPException(status_code=400, detail="Inspection quantity exceeds completed output")
    
    task["qualified_quantity"] += reporting.qualified_quantity
    task["unqualified_quantity"] += reporting.unqualified_quantity
    
    if task["qualified_quantity"] + task["unqualified_quantity"] == task["total_quantity"]:
        task["status"] = TaskStatus.COMPLETED
        task["completed_at"] = datetime.now()
        
        work_order = work_orders_db[task["work_order_id"]]
        all_operations_completed = True
        all_inspections_completed = True
        
        for operation in work_order["operations"]:
            if operation["completed_output"] < operation["planned_output"]:
                all_operations_completed = False
                break
        
        if all_operations_completed:
            for inspection in inspection_tasks_db.values():
                if (inspection["work_order_id"] == work_order["id"] and 
                    inspection["status"] != TaskStatus.COMPLETED):
                    all_inspections_completed = False
                    break
            
            if all_inspections_completed:
                work_order["status"] = WorkOrderStatus.COMPLETED
    
    return task
