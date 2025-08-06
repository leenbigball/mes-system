from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid
import hashlib
import secrets
from sqlalchemy.orm import Session
from .database import get_db, engine, SessionLocal
from .models import Base, User, Material, ProductionLine, Routing, BOM, WorkOrder, ProductionTask, InspectionTask, Session as SessionModel
from .models import UserRole, MaterialType, ProductionLineStatus, WorkOrderStatus, TaskStatus

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

@app.on_event("startup")
async def startup_event():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        create_default_admin(db)
        create_test_users(db)
    finally:
        db.close()

def create_default_admin(db: Session):
    existing_admin = db.query(User).filter(User.username == "admin").first()
    if not existing_admin:
        admin_id = generate_id()
        admin_user = User(
            id=admin_id,
            username="admin",
            password=hash_password("admin"),
            role=UserRole.ADMIN,
            name="系统管理员"
        )
        db.add(admin_user)
        db.commit()
def create_test_users(db: Session):
    test_users = [
        {"username": "kiwi", "password": "123456", "role": UserRole.MANAGER, "name": "经理"},
        {"username": "leen", "password": "123456", "role": UserRole.WORKER, "name": "工人"},
        {"username": "troy", "password": "123456", "role": UserRole.INSPECTOR, "name": "质检员"}
    ]
    
    for user_data in test_users:
        existing_user = db.query(User).filter(User.username == user_data["username"]).first()
        if not existing_user:
            user_id = generate_id()
            user = User(
                id=user_id,
                username=user_data["username"],
                password=hash_password(user_data["password"]),
                role=user_data["role"],
                name=user_data["name"]
            )
            db.add(user)
    db.commit()



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

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    session = db.query(SessionModel).filter(SessionModel.token == token).first()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {
        "id": session.user.id,
        "username": session.user.username,
        "role": session.user.role,
        "name": session.user.name
    }

def require_role(required_roles: List[UserRole]):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in required_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

@app.get("/healthz")
async def healthz(db: Session = Depends(get_db)):
    create_default_admin(db)
    return {"status": "ok"}

@app.post("/api/auth/login")
async def login(user_login: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_login.username).first()
    if user and verify_password(user_login.password, user.password):
        token = secrets.token_urlsafe(32)
        session = SessionModel(token=token, user_id=user.id)
        db.add(session)
        db.commit()
        return {
            "token": token,
            "user": {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "name": user.name
            }
        }
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/auth/logout")
async def logout(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(SessionModel).filter(SessionModel.user_id == current_user["id"]).first()
    if session:
        db.delete(session)
        db.commit()
    return {"message": "Logged out successfully"}

@app.get("/api/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {"id": current_user["id"], "username": current_user["username"], "role": current_user["role"]}

@app.post("/api/users")
async def create_user(user_create: UserCreate, current_user: dict = Depends(require_role([UserRole.ADMIN])), db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == user_create.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_id = generate_id()
    new_user = User(
        id=user_id,
        username=user_create.username,
        password=hash_password(user_create.password),
        role=user_create.role,
        name=user_create.username
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "id": new_user.id,
        "username": new_user.username,
        "role": new_user.role,
        "name": new_user.name,
        "created_at": new_user.created_at
    }

@app.get("/api/users")
async def list_users(current_user: dict = Depends(require_role([UserRole.ADMIN])), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "name": user.name,
        "created_at": user.created_at
    } for user in users]

@app.get("/api/workers-inspectors")
async def list_workers_inspectors(current_user: dict = Depends(require_role([UserRole.MANAGER])), db: Session = Depends(get_db)):
    users = db.query(User).filter(User.role.in_([UserRole.WORKER, UserRole.INSPECTOR])).all()
    return [{
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "name": user.name,
        "created_at": user.created_at
    } for user in users]

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_role([UserRole.ADMIN])), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.username == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin user")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@app.post("/api/materials")
async def create_material(material: MaterialCreate, current_user: dict = Depends(require_role([UserRole.MANAGER])), db: Session = Depends(get_db)):
    material_id = generate_id()
    new_material = Material(
        id=material_id,
        name=material.name,
        type=material.type,
        stock=getattr(material, 'initial_stock', 0)
    )
    db.add(new_material)
    db.commit()
    db.refresh(new_material)
    return {
        "id": new_material.id,
        "name": new_material.name,
        "type": new_material.type,
        "stock": new_material.stock,
        "created_at": new_material.created_at
    }

@app.get("/api/materials")
async def list_materials(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    materials = db.query(Material).all()
    return [{
        "id": material.id,
        "name": material.name,
        "type": material.type,
        "stock": material.stock,
        "created_at": material.created_at
    } for material in materials]

@app.put("/api/materials/{material_id}")
async def update_material(material_id: str, material_update: MaterialUpdate, current_user: dict = Depends(require_role([UserRole.MANAGER])), db: Session = Depends(get_db)):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    if material_update.name is not None:
        material.name = material_update.name
    if material_update.type is not None:
        material.type = material_update.type
    
    db.commit()
    db.refresh(material)
    return {
        "id": material.id,
        "name": material.name,
        "type": material.type,
        "stock": material.stock,
        "created_at": material.created_at
    }

@app.put("/api/materials/{material_id}/stock")
async def update_stock(material_id: str, stock_update: StockUpdate, current_user: dict = Depends(require_role([UserRole.MANAGER])), db: Session = Depends(get_db)):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    material.stock += stock_update.quantity
    
    db.commit()
    db.refresh(material)
    return {
        "id": material.id,
        "name": material.name,
        "type": material.type,
        "stock": material.stock,
        "created_at": material.created_at
    }

@app.delete("/api/materials/{material_id}")
async def delete_material(material_id: str, current_user: dict = Depends(require_role([UserRole.MANAGER])), db: Session = Depends(get_db)):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    db.delete(material)
    db.commit()
    return {"message": "Material deleted successfully"}

@app.post("/api/production-lines")
async def create_production_line(line: ProductionLineCreate, current_user: dict = Depends(require_role([UserRole.MANAGER])), db: Session = Depends(get_db)):
    line_id = generate_id()
    new_line = ProductionLine(
        id=line_id,
        name=line.name,
        status=ProductionLineStatus.IDLE
    )
    db.add(new_line)
    db.commit()
    db.refresh(new_line)
    return {
        "id": new_line.id,
        "name": new_line.name,
        "status": new_line.status,
        "created_at": new_line.created_at
    }

@app.get("/api/production-lines")
async def list_production_lines(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    lines = db.query(ProductionLine).all()
    return [{
        "id": line.id,
        "name": line.name,
        "status": line.status,
        "created_at": line.created_at
    } for line in lines]

@app.put("/api/production-lines/{line_id}")
async def update_production_line(line_id: str, line_update: ProductionLineUpdate, current_user: dict = Depends(require_role([UserRole.MANAGER])), db: Session = Depends(get_db)):
    line = db.query(ProductionLine).filter(ProductionLine.id == line_id).first()
    if not line:
        raise HTTPException(status_code=404, detail="Production line not found")
    
    line.name = line_update.name
    db.commit()
    db.refresh(line)
    return {
        "id": line.id,
        "name": line.name,
        "status": line.status,
        "created_at": line.created_at
    }

@app.delete("/api/production-lines/{line_id}")
async def delete_production_line(line_id: str, current_user: dict = Depends(require_role([UserRole.MANAGER])), db: Session = Depends(get_db)):
    line = db.query(ProductionLine).filter(ProductionLine.id == line_id).first()
    if not line:
        raise HTTPException(status_code=404, detail="Production line not found")
    db.delete(line)
    db.commit()
    return {"message": "Production line deleted successfully"}

@app.post("/api/init-test-data")
async def init_test_data(current_user: dict = Depends(require_role([UserRole.ADMIN])), db: Session = Depends(get_db)):
    db.query(SessionModel).delete()
    db.query(InspectionTask).delete()
    db.query(ProductionTask).delete()
    db.query(WorkOrder).delete()
    db.query(BOM).delete()
    db.query(Routing).delete()
    db.query(ProductionLine).delete()
    db.query(Material).delete()
    db.query(User).delete()
    db.commit()
    
    create_default_admin(db)
    
    test_users = [
        {"username": "kiwi", "password": "123456", "role": UserRole.MANAGER, "name": "生产经理"},
        {"username": "leen", "password": "123456", "role": UserRole.WORKER, "name": "生产工人"},
        {"username": "troy", "password": "123456", "role": UserRole.INSPECTOR, "name": "质检员"}
    ]
    
    for user_data in test_users:
        user_id = generate_id()
        user = User(
            id=user_id,
            username=user_data["username"],
            password=hash_password(user_data["password"]),
            role=user_data["role"],
            name=user_data["name"]
        )
        db.add(user)
    
    materials = [
        {"name": "凳腿", "type": MaterialType.RAW_MATERIAL, "stock": 100},
        {"name": "凳面", "type": MaterialType.RAW_MATERIAL, "stock": 100},
        {"name": "木凳", "type": MaterialType.FINISHED_GOOD, "stock": 0}
    ]
    
    material_ids = {}
    for material_data in materials:
        material_id = generate_id()
        material = Material(
            id=material_id,
            name=material_data["name"],
            type=material_data["type"],
            stock=material_data["stock"]
        )
        db.add(material)
        material_ids[material_data["name"]] = material_id
    
    line_id = generate_id()
    line = ProductionLine(
        id=line_id,
        name="木凳组装线",
        status=ProductionLineStatus.IDLE
    )
    db.add(line)
    
    routing_id = generate_id()
    routing = Routing(
        id=routing_id,
        name="木凳组装",
        finished_product_id=material_ids["木凳"],
        operations=[
            {
                "name": "组装",
                "output_material_id": material_ids["木凳"],
                "output_quantity": 1,
                "requires_inspection": True
            }
        ]
    )
    db.add(routing)
    
    bom_id = generate_id()
    bom = BOM(
        id=bom_id,
        name="木凳",
        routing_id=routing_id,
        components=[
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
        ]
    )
    db.add(bom)
    
    db.commit()
    
    return {
        "message": "Test data initialized successfully",
        "users": db.query(User).count(),
        "materials": db.query(Material).count(),
        "production_lines": db.query(ProductionLine).count(),
        "routings": db.query(Routing).count(),
        "boms": db.query(BOM).count()
    }

@app.post("/api/routings")
async def create_routing(routing: RoutingCreate, current_user: dict = Depends(require_role([UserRole.MANAGER])), db: Session = Depends(get_db)):
    finished_product = db.query(Material).filter(Material.id == routing.finished_product_id).first()
    if not finished_product:
        raise HTTPException(status_code=400, detail="Finished product not found")
    
    if finished_product.type != MaterialType.FINISHED_GOOD:
        raise HTTPException(status_code=400, detail="Product must be a finished good")
    
    if not routing.operations:
        raise HTTPException(status_code=400, detail="At least one operation is required")
    
    final_op = routing.operations[-1]
    if final_op.output_material_id != routing.finished_product_id:
        raise HTTPException(status_code=400, detail="Final operation must output the finished product")
    if final_op.output_quantity != 1:
        raise HTTPException(status_code=400, detail="Final operation output quantity must be 1")
    
    for i, op in enumerate(routing.operations[:-1]):
        material = db.query(Material).filter(Material.id == op.output_material_id).first()
        if not material:
            raise HTTPException(status_code=400, detail=f"Operation {i+1} output material not found")
        if material.type != MaterialType.SEMI_FINISHED:
            raise HTTPException(status_code=400, detail=f"Operation {i+1} must output semi-finished material")
    
    routing_id = generate_id()
    new_routing = Routing(
        id=routing_id,
        name=routing.name,
        finished_product_id=routing.finished_product_id,
        operations=[
            {
                "name": op.name,
                "output_material_id": op.output_material_id,
                "output_quantity": op.output_quantity,
                "requires_inspection": op.requires_inspection
            } for op in routing.operations
        ]
    )
    db.add(new_routing)
    db.commit()
    db.refresh(new_routing)
    return {
        "id": new_routing.id,
        "name": new_routing.name,
        "finished_product_id": new_routing.finished_product_id,
        "operations": new_routing.operations,
        "created_at": new_routing.created_at
    }

@app.get("/api/routings")
async def list_routings(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    routings = db.query(Routing).all()
    return [{
        "id": routing.id,
        "name": routing.name,
        "finished_product_id": routing.finished_product_id,
        "operations": routing.operations,
        "created_at": routing.created_at
    } for routing in routings]

@app.delete("/api/routings/{routing_id}")
async def delete_routing(routing_id: str, current_user: dict = Depends(require_role([UserRole.MANAGER])), db: Session = Depends(get_db)):
    routing = db.query(Routing).filter(Routing.id == routing_id).first()
    if not routing:
        raise HTTPException(status_code=404, detail="Routing not found")
    db.delete(routing)
    db.commit()
    return {"message": "Routing deleted successfully"}

@app.post("/api/boms")
async def create_bom(bom: BOMCreate, current_user: dict = Depends(require_role([UserRole.MANAGER])), db: Session = Depends(get_db)):
    routing = db.query(Routing).filter(Routing.id == bom.routing_id).first()
    if not routing:
        raise HTTPException(status_code=400, detail="Routing not found")
    
    if not bom.components:
        raise HTTPException(status_code=400, detail="At least one component is required")
    
    first_op_materials = [c for c in bom.components if c.operation_index == 0]
    if not first_op_materials:
        raise HTTPException(status_code=400, detail="First operation must have at least one material")
    
    seen_combinations = set()
    for comp in bom.components:
        material = db.query(Material).filter(Material.id == comp.material_id).first()
        if not material:
            raise HTTPException(status_code=400, detail=f"Material {comp.material_id} not found")
        if material.type != MaterialType.RAW_MATERIAL:
            raise HTTPException(status_code=400, detail="BOM components must be raw materials")
        
        if comp.operation_index >= len(routing.operations):
            raise HTTPException(status_code=400, detail=f"Invalid operation index {comp.operation_index}")
        
        combination = (comp.material_id, comp.operation_index)
        if combination in seen_combinations:
            raise HTTPException(status_code=400, detail="Duplicate material-operation combination")
        seen_combinations.add(combination)
    
    bom_id = generate_id()
    new_bom = BOM(
        id=bom_id,
        name=bom.name,
        routing_id=bom.routing_id,
        components=[
            {
                "material_id": comp.material_id,
                "quantity": comp.quantity,
                "operation_index": comp.operation_index
            } for comp in bom.components
        ]
    )
    db.add(new_bom)
    db.commit()
    db.refresh(new_bom)
    return {
        "id": new_bom.id,
        "name": new_bom.name,
        "routing_id": new_bom.routing_id,
        "components": new_bom.components,
        "created_at": new_bom.created_at
    }

@app.get("/api/boms")
async def list_boms(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    boms = db.query(BOM).all()
    return [{
        "id": bom.id,
        "name": bom.name,
        "routing_id": bom.routing_id,
        "components": bom.components,
        "created_at": bom.created_at
    } for bom in boms]

@app.delete("/api/boms/{bom_id}")
async def delete_bom(bom_id: str, current_user: dict = Depends(require_role([UserRole.MANAGER])), db: Session = Depends(get_db)):
    bom = db.query(BOM).filter(BOM.id == bom_id).first()
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")
    db.delete(bom)
    db.commit()
    return {"message": "BOM deleted successfully"}

@app.post("/api/work-orders")
async def create_work_order(work_order: WorkOrderCreate, current_user: dict = Depends(require_role([UserRole.MANAGER])), db: Session = Depends(get_db)):
    bom = db.query(BOM).filter(BOM.id == work_order.bom_id).first()
    if not bom:
        raise HTTPException(status_code=400, detail="BOM not found")
    
    routing = db.query(Routing).filter(Routing.id == bom.routing_id).first()
    if not routing:
        raise HTTPException(status_code=400, detail="Routing not found")
    
    work_order_id = generate_id()
    new_work_order = WorkOrder(
        id=work_order_id,
        bom_id=work_order.bom_id,
        planned_quantity=work_order.planned_quantity,
        status=WorkOrderStatus.CREATED,
        operations=[
            {
                "index": i,
                "name": op["name"],
                "output_material_id": op["output_material_id"],
                "planned_output": op["output_quantity"] * work_order.planned_quantity,
                "completed_output": 0,
                "requires_inspection": op["requires_inspection"],
                "assigned_tasks": 0
            } for i, op in enumerate(routing.operations)
        ]
    )
    db.add(new_work_order)
    
    for i, op in enumerate(routing.operations):
        if op["requires_inspection"]:
            inspection_id = generate_id()
            inspection_task = InspectionTask(
                id=inspection_id,
                work_order_id=work_order_id,
                operation_index=i,
                operation_name=op["name"],
                total_quantity=op["output_quantity"] * work_order.planned_quantity,
                qualified_quantity=0,
                unqualified_quantity=0,
                status=TaskStatus.NOT_STARTED,
                assigned_inspector=None
            )
            db.add(inspection_task)
    
    db.commit()
    db.refresh(new_work_order)
    return {
        "id": new_work_order.id,
        "bom_id": new_work_order.bom_id,
        "planned_quantity": new_work_order.planned_quantity,
        "status": new_work_order.status,
        "operations": new_work_order.operations,
        "created_at": new_work_order.created_at
    }

@app.get("/api/work-orders")
async def list_work_orders(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    work_orders = db.query(WorkOrder).all()
    return [{
        "id": work_order.id,
        "bom_id": work_order.bom_id,
        "planned_quantity": work_order.planned_quantity,
        "status": work_order.status,
        "operations": work_order.operations,
        "created_at": work_order.created_at
    } for work_order in work_orders]

@app.get("/api/work-orders/{work_order_id}")
async def get_work_order(work_order_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    bom = db.query(BOM).filter(BOM.id == work_order.bom_id).first()
    routing = db.query(Routing).filter(Routing.id == bom.routing_id).first()
    production_tasks = db.query(ProductionTask).filter(ProductionTask.work_order_id == work_order_id).all()
    inspection_tasks = db.query(InspectionTask).filter(InspectionTask.work_order_id == work_order_id).all()
    
    return {
        "id": work_order.id,
        "bom_id": work_order.bom_id,
        "planned_quantity": work_order.planned_quantity,
        "status": work_order.status,
        "operations": work_order.operations,
        "created_at": work_order.created_at,
        "bom": {
            "id": bom.id,
            "name": bom.name,
            "routing_id": bom.routing_id,
            "components": bom.components,
            "created_at": bom.created_at
        },
        "routing": {
            "id": routing.id,
            "name": routing.name,
            "finished_product_id": routing.finished_product_id,
            "operations": routing.operations,
            "created_at": routing.created_at
        },
        "production_tasks": [{
            "id": task.id,
            "work_order_id": task.work_order_id,
            "operation_index": task.operation_index,
            "operation_name": task.operation_name,
            "planned_output": task.planned_output,
            "completed_output": task.completed_output,
            "production_line_id": task.production_line_id,
            "assigned_worker": task.assigned_worker,
            "status": task.status,
            "material_feeding": task.material_feeding,
            "material_requirements": task.material_requirements,
            "created_at": task.created_at,
            "started_at": task.started_at,
            "completed_at": task.completed_at
        } for task in production_tasks],
        "inspection_tasks": [{
            "id": task.id,
            "work_order_id": task.work_order_id,
            "operation_index": task.operation_index,
            "operation_name": task.operation_name,
            "total_quantity": task.total_quantity,
            "qualified_quantity": task.qualified_quantity,
            "unqualified_quantity": task.unqualified_quantity,
            "status": task.status,
            "assigned_inspector": task.assigned_inspector,
            "created_at": task.created_at,
            "started_at": task.started_at,
            "completed_at": task.completed_at
        } for task in inspection_tasks]
    }

@app.post("/api/production-tasks")
async def create_production_task(task: ProductionTaskCreate, current_user: dict = Depends(require_role([UserRole.MANAGER])), db: Session = Depends(get_db)):
    work_order = db.query(WorkOrder).filter(WorkOrder.id == task.work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=400, detail="Work order not found")
    
    if task.operation_index >= len(work_order.operations):
        raise HTTPException(status_code=400, detail="Invalid operation index")
    
    operation = work_order.operations[task.operation_index]
    remaining_output = operation["planned_output"] - operation["assigned_tasks"]
    if task.planned_output > remaining_output:
        raise HTTPException(status_code=400, detail="Planned output exceeds remaining quantity")
    
    production_line = db.query(ProductionLine).filter(ProductionLine.id == task.production_line_id).first()
    if not production_line:
        raise HTTPException(status_code=400, detail="Production line not found")
    
    worker = db.query(User).filter(User.username == task.assigned_worker, User.role == UserRole.WORKER).first()
    if not worker:
        raise HTTPException(status_code=400, detail="Worker not found")
    
    task_id = generate_id()
    
    bom = db.query(BOM).filter(BOM.id == work_order.bom_id).first()
    material_requirements = []
    for component in bom.components:
        if component["operation_index"] == task.operation_index:
            material = db.query(Material).filter(Material.id == component["material_id"]).first()
            material_requirements.append({
                "material_id": component["material_id"],
                "material_name": material.name if material else "Unknown",
                "required_quantity": component["quantity"] * task.planned_output,
                "fed_quantity": 0
            })
    
    new_task = ProductionTask(
        id=task_id,
        work_order_id=task.work_order_id,
        operation_index=task.operation_index,
        operation_name=operation["name"],
        planned_output=task.planned_output,
        completed_output=0,
        production_line_id=task.production_line_id,
        assigned_worker=task.assigned_worker,
        status=TaskStatus.NOT_STARTED,
        material_feeding=[],
        material_requirements=material_requirements
    )
    db.add(new_task)
    
    operation["assigned_tasks"] += task.planned_output
    work_order.operations = work_order.operations
    
    db.commit()
    db.refresh(new_task)
    return {
        "id": new_task.id,
        "work_order_id": new_task.work_order_id,
        "operation_index": new_task.operation_index,
        "operation_name": new_task.operation_name,
        "planned_output": new_task.planned_output,
        "completed_output": new_task.completed_output,
        "production_line_id": new_task.production_line_id,
        "assigned_worker": new_task.assigned_worker,
        "status": new_task.status,
        "material_feeding": new_task.material_feeding,
        "material_requirements": new_task.material_requirements,
        "created_at": new_task.created_at,
        "started_at": new_task.started_at,
        "completed_at": new_task.completed_at
    }

@app.get("/api/production-tasks")
async def list_production_tasks(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user["role"] == UserRole.WORKER:
        tasks = db.query(ProductionTask).filter(ProductionTask.assigned_worker == current_user["username"]).all()
    else:
        tasks = db.query(ProductionTask).all()
    
    return [{
        "id": task.id,
        "work_order_id": task.work_order_id,
        "operation_index": task.operation_index,
        "operation_name": task.operation_name,
        "planned_output": task.planned_output,
        "completed_output": task.completed_output,
        "production_line_id": task.production_line_id,
        "assigned_worker": task.assigned_worker,
        "status": task.status,
        "material_feeding": task.material_feeding,
        "material_requirements": task.material_requirements,
        "created_at": task.created_at,
        "started_at": task.started_at,
        "completed_at": task.completed_at
    } for task in tasks]

@app.post("/api/production-tasks/{task_id}/start")
async def start_production_task(task_id: str, current_user: dict = Depends(require_role([UserRole.WORKER])), db: Session = Depends(get_db)):
    task = db.query(ProductionTask).filter(ProductionTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Production task not found")
    
    if task.assigned_worker != current_user["username"]:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    
    if task.status != TaskStatus.NOT_STARTED:
        raise HTTPException(status_code=400, detail="Task already started")
    
    line = db.query(ProductionLine).filter(ProductionLine.id == task.production_line_id).first()
    if line.status != ProductionLineStatus.IDLE:
        raise HTTPException(status_code=400, detail="Production line is busy")
    
    task.status = TaskStatus.IN_PROGRESS
    task.started_at = datetime.now()
    line.status = ProductionLineStatus.BUSY
    
    work_order = db.query(WorkOrder).filter(WorkOrder.id == task.work_order_id).first()
    if work_order.status == WorkOrderStatus.CREATED:
        work_order.status = WorkOrderStatus.IN_PROGRESS
    
    db.commit()
    db.refresh(task)
    return {
        "id": task.id,
        "work_order_id": task.work_order_id,
        "operation_index": task.operation_index,
        "operation_name": task.operation_name,
        "planned_output": task.planned_output,
        "completed_output": task.completed_output,
        "production_line_id": task.production_line_id,
        "assigned_worker": task.assigned_worker,
        "status": task.status,
        "material_feeding": task.material_feeding,
        "material_requirements": task.material_requirements,
        "created_at": task.created_at,
        "started_at": task.started_at,
        "completed_at": task.completed_at
    }

@app.post("/api/production-tasks/{task_id}/feed-material")
async def feed_material(task_id: str, feeding: MaterialFeeding, current_user: dict = Depends(require_role([UserRole.WORKER])), db: Session = Depends(get_db)):
    task = db.query(ProductionTask).filter(ProductionTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Production task not found")
    
    if task.assigned_worker != current_user["username"]:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    
    if task.status != TaskStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Task not in progress")
    
    work_order = db.query(WorkOrder).filter(WorkOrder.id == task.work_order_id).first()
    bom = db.query(BOM).filter(BOM.id == work_order.bom_id).first()
    
    required_quantity = 0
    for component in bom.components:
        if (component["material_id"] == feeding.material_id and 
            component["operation_index"] == task.operation_index):
            required_quantity = component["quantity"] * task.planned_output
            break
    
    if required_quantity == 0:
        raise HTTPException(status_code=400, detail="Material not required for this operation")
    
    current_fed = 0
    for feed in task.material_feeding:
        if feed.get("material_id") == feeding.material_id:
            current_fed += feed.get("quantity", 0)
    
    if current_fed + feeding.quantity > required_quantity:
        raise HTTPException(status_code=400, detail="Feeding quantity exceeds requirement")
    
    material = db.query(Material).filter(Material.id == feeding.material_id).first()
    if material.stock < feeding.quantity:
        raise HTTPException(status_code=400, detail="Insufficient material stock")
    
    task.material_feeding.append({
        "material_id": feeding.material_id,
        "quantity": feeding.quantity,
        "fed_at": datetime.now().isoformat()
    })
    material.stock -= feeding.quantity
    
    for req in task.material_requirements:
        if req["material_id"] == feeding.material_id:
            req["fed_quantity"] = current_fed + feeding.quantity
            break
    
    task.material_requirements = task.material_requirements
    
    db.commit()
    db.refresh(task)
    return {
        "id": task.id,
        "work_order_id": task.work_order_id,
        "operation_index": task.operation_index,
        "operation_name": task.operation_name,
        "planned_output": task.planned_output,
        "completed_output": task.completed_output,
        "production_line_id": task.production_line_id,
        "assigned_worker": task.assigned_worker,
        "status": task.status,
        "material_feeding": task.material_feeding,
        "material_requirements": task.material_requirements,
        "created_at": task.created_at,
        "started_at": task.started_at,
        "completed_at": task.completed_at
    }

@app.post("/api/production-tasks/{task_id}/report-production")
async def report_production(task_id: str, reporting: ProductionReporting, current_user: dict = Depends(require_role([UserRole.WORKER])), db: Session = Depends(get_db)):
    task = db.query(ProductionTask).filter(ProductionTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Production task not found")
    
    if task.assigned_worker != current_user["username"]:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    
    if task.status != TaskStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Task not in progress")
    
    if task.completed_output + reporting.output_quantity > task.planned_output:
        raise HTTPException(status_code=400, detail="Output quantity exceeds planned output")
    
    work_order = db.query(WorkOrder).filter(WorkOrder.id == task.work_order_id).first()
    bom = db.query(BOM).filter(BOM.id == work_order.bom_id).first()
    
    for component in bom.components:
        if component["operation_index"] == task.operation_index:
            required_per_unit = component["quantity"]
            fed_quantity = sum(feed.get("quantity", 0) for feed in task.material_feeding if feed.get("material_id") == component["material_id"])
            max_output_from_material = fed_quantity // required_per_unit
            
            if task.completed_output + reporting.output_quantity > max_output_from_material:
                raise HTTPException(status_code=400, detail=f"Insufficient material {component['material_id']} fed")
    
    if task.operation_index > 0:
        routing = db.query(Routing).filter(Routing.id == bom.routing_id).first()
        prev_operation = routing.operations[task.operation_index - 1]
        prev_material_id = prev_operation["output_material_id"]
        
        required_semi = reporting.output_quantity
        prev_material = db.query(Material).filter(Material.id == prev_material_id).first()
        
        if required_semi > prev_material.stock:
            raise HTTPException(status_code=400, detail="Insufficient semi-finished goods in stock")
        
        prev_material.stock -= required_semi
    
    task.completed_output += reporting.output_quantity
    operation = work_order.operations[task.operation_index]
    operation["completed_output"] += reporting.output_quantity
    work_order.operations = work_order.operations
    
    routing = db.query(Routing).filter(Routing.id == bom.routing_id).first()
    output_material_id = routing.operations[task.operation_index]["output_material_id"]
    output_material = db.query(Material).filter(Material.id == output_material_id).first()
    output_material.stock += reporting.output_quantity
    
    if task.completed_output == task.planned_output:
        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.now()
        
        line = db.query(ProductionLine).filter(ProductionLine.id == task.production_line_id).first()
        line.status = ProductionLineStatus.IDLE
    
    all_operations_completed = True
    for operation in work_order.operations:
        if operation["completed_output"] < operation["planned_output"]:
            all_operations_completed = False
            break
    
    if all_operations_completed:
        inspections = db.query(InspectionTask).filter(InspectionTask.work_order_id == work_order.id).all()
        all_inspections_completed = all(inspection.status == TaskStatus.COMPLETED for inspection in inspections)
        
        if all_inspections_completed:
            work_order.status = WorkOrderStatus.COMPLETED
    
    db.commit()
    db.refresh(task)
    return {
        "id": task.id,
        "work_order_id": task.work_order_id,
        "operation_index": task.operation_index,
        "operation_name": task.operation_name,
        "planned_output": task.planned_output,
        "completed_output": task.completed_output,
        "production_line_id": task.production_line_id,
        "assigned_worker": task.assigned_worker,
        "status": task.status,
        "material_feeding": task.material_feeding,
        "material_requirements": task.material_requirements,
        "created_at": task.created_at,
        "started_at": task.started_at,
        "completed_at": task.completed_at
    }

@app.post("/api/inspection-tasks/{task_id}/assign")
async def assign_inspection_task(task_id: str, assignment: InspectionAssignment, current_user: dict = Depends(require_role([UserRole.MANAGER])), db: Session = Depends(get_db)):
    task = db.query(InspectionTask).filter(InspectionTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Inspection task not found")
    
    inspector = db.query(User).filter(User.username == assignment.inspector_username, User.role == UserRole.INSPECTOR).first()
    if not inspector:
        raise HTTPException(status_code=400, detail="Inspector not found")
    
    task.assigned_inspector = assignment.inspector_username
    db.commit()
    db.refresh(task)
    return {
        "id": task.id,
        "work_order_id": task.work_order_id,
        "operation_index": task.operation_index,
        "operation_name": task.operation_name,
        "total_quantity": task.total_quantity,
        "qualified_quantity": task.qualified_quantity,
        "unqualified_quantity": task.unqualified_quantity,
        "status": task.status,
        "assigned_inspector": task.assigned_inspector,
        "created_at": task.created_at,
        "started_at": task.started_at,
        "completed_at": task.completed_at
    }

@app.get("/api/inspection-tasks")
async def list_inspection_tasks(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user["role"] == UserRole.INSPECTOR:
        tasks = db.query(InspectionTask).filter(InspectionTask.assigned_inspector == current_user["username"]).all()
    else:
        tasks = db.query(InspectionTask).all()
    
    return [{
        "id": task.id,
        "work_order_id": task.work_order_id,
        "operation_index": task.operation_index,
        "operation_name": task.operation_name,
        "total_quantity": task.total_quantity,
        "qualified_quantity": task.qualified_quantity,
        "unqualified_quantity": task.unqualified_quantity,
        "status": task.status,
        "assigned_inspector": task.assigned_inspector,
        "created_at": task.created_at,
        "started_at": task.started_at,
        "completed_at": task.completed_at
    } for task in tasks]

@app.post("/api/inspection-tasks/{task_id}/start")
async def start_inspection_task(task_id: str, current_user: dict = Depends(require_role([UserRole.INSPECTOR])), db: Session = Depends(get_db)):
    task = db.query(InspectionTask).filter(InspectionTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Inspection task not found")
    
    if task.assigned_inspector != current_user["username"]:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    
    if task.status != TaskStatus.NOT_STARTED:
        raise HTTPException(status_code=400, detail="Task already started")
    
    task.status = TaskStatus.IN_PROGRESS
    task.started_at = datetime.now()
    
    db.commit()
    db.refresh(task)
    return {
        "id": task.id,
        "work_order_id": task.work_order_id,
        "operation_index": task.operation_index,
        "operation_name": task.operation_name,
        "total_quantity": task.total_quantity,
        "qualified_quantity": task.qualified_quantity,
        "unqualified_quantity": task.unqualified_quantity,
        "status": task.status,
        "assigned_inspector": task.assigned_inspector,
        "created_at": task.created_at,
        "started_at": task.started_at,
        "completed_at": task.completed_at
    }

@app.post("/api/inspection-tasks/{task_id}/report-inspection")
async def report_inspection(task_id: str, reporting: InspectionReporting, current_user: dict = Depends(require_role([UserRole.INSPECTOR])), db: Session = Depends(get_db)):
    task = db.query(InspectionTask).filter(InspectionTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Inspection task not found")
    
    if task.assigned_inspector != current_user["username"]:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    
    if task.status != TaskStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Task not in progress")
    
    total_inspected = task.qualified_quantity + task.unqualified_quantity
    new_total = total_inspected + reporting.qualified_quantity + reporting.unqualified_quantity
    
    work_order = db.query(WorkOrder).filter(WorkOrder.id == task.work_order_id).first()
    operation = work_order.operations[task.operation_index]
    
    if new_total > operation["completed_output"]:
        raise HTTPException(status_code=400, detail="Inspection quantity exceeds completed output")
    
    task.qualified_quantity += reporting.qualified_quantity
    task.unqualified_quantity += reporting.unqualified_quantity
    
    if task.qualified_quantity + task.unqualified_quantity == task.total_quantity:
        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.now()
        
        all_operations_completed = True
        for operation in work_order.operations:
            if operation["completed_output"] < operation["planned_output"]:
                all_operations_completed = False
                break
        
        if all_operations_completed:
            inspections = db.query(InspectionTask).filter(InspectionTask.work_order_id == work_order.id).all()
            all_inspections_completed = all(inspection.status == TaskStatus.COMPLETED for inspection in inspections)
            
            if all_inspections_completed:
                work_order.status = WorkOrderStatus.COMPLETED
    
    db.commit()
    db.refresh(task)
    return {
        "id": task.id,
        "work_order_id": task.work_order_id,
        "operation_index": task.operation_index,
        "operation_name": task.operation_name,
        "total_quantity": task.total_quantity,
        "qualified_quantity": task.qualified_quantity,
        "unqualified_quantity": task.unqualified_quantity,
        "status": task.status,
        "assigned_inspector": task.assigned_inspector,
        "created_at": task.created_at,
        "started_at": task.started_at,
        "completed_at": task.completed_at
    }
