import uuid
from flask import Flask, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_security import UserMixin, RoleMixin
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField
from wtforms.validators import DataRequired, Email
from datetime import datetime


app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///your_database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your_secret_key'

db = SQLAlchemy(app)



roles_users = db.Table(
    'roles_users',
    db.Column('user_id', db.Integer(), db.ForeignKey('user.id')),
    db.Column('role_id', db.Integer(), db.ForeignKey('role.id'))
)




class User(db.Model, UserMixin):
    __tablename__ = 'user'
    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    username = db.Column(db.String(255), unique=False)
    email = db.Column(db.String(255), unique=True)
    password = db.Column(db.String(255))
    active = db.Column(db.Boolean())
    fs_uniquifier = db.Column(db.String(255), unique=True, nullable=False)
    roles = db.relationship('Role', secondary='roles_users',
                            backref=db.backref('users', lazy='dynamic'))
    
    def __init__(self, email, password,username,active,roles):
        self.username=username
        self.email = email
        self.password=password
        self.active=active
        self.roles = roles
        self.fs_uniquifier = generate_random_uniquifier()

def generate_random_uniquifier():
    # Generate a unique value using UUID
    uniquifier = str(uuid.uuid4())
    return uniquifier

class Role(db.Model, RoleMixin):
    __tablename__ = 'role'
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(80), unique=True)
    description = db.Column(db.String(255))
    # permissions = db.Column(db.UnicodeText)

class LoginForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember_me = BooleanField('Remember Me')

class Section(db.Model):
    section_id = db.Column(db.Integer, primary_key=True)
    section_name = db.Column(db.String(100), unique=True, nullable=False)
    section_description = db.Column(db.String(1000), nullable=False)
    products = db.relationship('Product', backref='section', lazy=True, cascade='all, delete-orphan')

class Product(db.Model):
    product_id = db.Column(db.Integer, primary_key=True)
    product_name = db.Column(db.String(100), nullable=False)
    product_description = db.Column(db.String(255))
    product_rate_per_unit = db.Column(db.Float, nullable=False)
    product_unit = db.Column(db.String(20))
    product_stock = db.Column(db.Integer, nullable=False)
    section_id = db.Column(db.Integer, db.ForeignKey('section.section_id'), nullable=False)

    def __repr__(self):
        return f"Product('{self.product_name}', Description: {self.product_description}, Rate: {self.product_rate_per_unit} {self.product_unit})"

class UserCart(db.Model):
    item_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    product_id = db.Column(db.Integer, nullable=False)
    product_name = db.Column(db.String(100), nullable=False)
    product_rate_per_unit = db.Column(db.Float, nullable=False)
    product_qty = db.Column(db.Integer, nullable=False)
    amount = db.Column(db.Float, nullable=False)

class Joint(db.Model):
    __tablename__ = 'joint'
    section_id = db.Column(db.Integer, db.ForeignKey('section.section_id'), primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.product_id'), primary_key=True)

class UserTransaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    product_id = db.Column(db.Integer, nullable=False)
    product_name = db.Column(db.String(100), nullable=False)
    product_rate_per_unit = db.Column(db.Float, nullable=False)
    product_qty = db.Column(db.Integer, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    transaction_date = db.Column(db.DateTime, default=datetime.utcnow)  # Use db.DateTime for a datetime field


if __name__ == '__main__':
    db.create_all()
    app.run(debug=True)
