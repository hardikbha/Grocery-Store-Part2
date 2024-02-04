import time
from datetime import datetime
from flask import Flask, render_template, render_template_string, jsonify, request, abort, send_file
from flask_login import login_user , current_user
from api.resource import User, api
from celery.result import AsyncResult
from models import db, User as user_model, Role,Section, Product, UserCart, Joint, UserTransaction
# from models import db, User as user_model, Role
from security import user_datastore, security
from flask_security import auth_required , roles_accepted
from celery_worker import make_celery
from celery.schedules import timedelta
from httplib2 import Http
from flask_mail import Message , Mail
from datetime import datetime, timedelta
from flask_caching import Cache
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from csv import DictWriter
from json import dumps

app = Flask(__name__)


app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///grocery_store.sqlite3"
app.config['SECRET_KEY'] = "thisissecretkey"
app.config["SECURITY_PASSWORD_SALT"] = "salt"
app.config['SECURITY_TRACKABLE'] = False 
app.config['WTF_CSRF_ENABLED'] = False
app.config["SECURITY_TOKEN_AUTHENTICATION_HEADER"] = "Authentication-Token"
app.config["SECURITY_PASSWORD_HASH"] = "bcrypt"
app.config['SECURITY_USER_DATASTORE'] = user_datastore
app.config['CACHE_REDIS_HOST'] = "localhost"
app.config['CACHE_REDIS_PORT'] = 6379
app.config['CACHE_REDIS_DB'] = 3
app.config['CACHE_DEFAULT_TIMEOUT'] = 300






cache = Cache(app, config={'CACHE_TYPE': 'RedisCache'})
app.config['CACHE_DEFAULT_TIMEOUT'] = 300


api.init_app(app)

security.init_app(app,user_datastore)
db.init_app(app)


app.config.update(
    CELERY_BROKER_URL='redis://localhost:6379',
    CELERY_RESULT_BACKEND='redis://localhost:6379'
)

app.app_context().push()



# Import Celery and create an instance
celery = make_celery(app)

# Celery task to add two numbers
@celery.task()
def add_together(a, b):
    time.sleep(5)
    return a + b

# Celery periodic task to send reminders
@celery.on_after_configure.connect
def setup_periodic_tasks1(sender, **kwargs):
    sender.add_periodic_task(
        timedelta(days=1),
        send_reminder.s(),
        name='send_reminder_day',
    )

# Celery periodic task to generate and send reminder emails every 10 seconds
@celery.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        timedelta(seconds=10),
        send_reminer_via_email.s(),
        name='send_reminder_every_10_seconds',
    )

# Celery task to generate a CSV file for user transactions
@celery.task()
def generate_csv(username):
    import csv
    from models import UserTransaction, Section
    
    transactions = UserTransaction.query.filter_by(username=username).all()
    fields = ["Product", "Section", "UserTransaction", "Amount", "UserName"]
    rows = []
    for transaction in transactions:
        rows.append([transaction.product_name, transaction.product_rate_per_unit, transaction.product_qty, transaction.amount, transaction.username])
    with open("static/data.csv", "w") as csvfile:
        csvwriter = csv.writer(csvfile)
        csvwriter.writerow(fields)
        csvwriter.writerows(rows)
    return f"CSV file generated for user !"

# Celery task to generate a CSV file for a specific section
@celery.task()
def generate_section_csv(id):
    try:
        print("Section ID:", id)
        section = Section.query.filter_by(section_id=id).first()

        if section is None:
            return f"No section found with ID {id}"

        fields = ["Section id", "Section Name", "Section Description", "Product Name", "Product Rate", "Product Stock"]
        rows = [
            {
                "Section id": section.section_id,
                "Section Name": section.section_name,
                "Section Description": section.section_description,
                "Product Name": product.product_name,
                "Product Rate": product.product_rate_per_unit,
                "Product Stock": product.product_stock,
            }
            for product in section.products
        ]

        with open("static/sectionData.csv", "w", newline="") as csvfile:
            csvwriter = DictWriter(csvfile, fieldnames=fields)
            csvwriter.writeheader()
            csvwriter.writerows(rows)

        return f"CSV file generated for the given section"
    except Exception as e:
        return f"Error: {str(e)}"

# Celery task to send reminders to users via a Google Chat webhook
@celery.task
def send_reminder():
    WEBHOOK_URL = "https://chat.googleapis.com/v1/spaces/AAAAv-4OAik/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=SXMX4z2PepMTpTFJNLiHS-lpGN0kz5ziUGTfe6B1vsE"
    
    url = WEBHOOK_URL
    all_users = user_model.query.all()
    
    for user in all_users:
        latest_transaction = UserTransaction.query.filter_by(username=user.username).order_by(UserTransaction.transaction_date.desc()).first()
        
        if latest_transaction is None:
            bot_message = {
                'text': f'Hello {user.username}.. You have not booked any shows yet. Please visit our site to book.'
            }
        elif latest_transaction.transaction_date.date() < (datetime.utcnow() - timedelta(days=1)).date():
            bot_message = {
                'text': f'Hello {user.username}.. It has been more than 24 hours since your last transaction. Please visit our site to book again.'
            }

        message_headers = {'Content-Type': 'application/json; charset=UTF-8'}
        http_obj = Http()
        response = http_obj.request(
            uri=url,
            method='POST',
            headers=message_headers,
            body=dumps(bot_message),
        )
        
        print(response)
    
    return "Reminder is being sent successfully"

# Email configuration
SMPTP_SERVER_HOST = "localhost"
SMPTP_SERVER_PORT = 1025
SENDER_ADDRESS = "admin@example.com"
SENDER_PASSWORD = ""

# Function to send email
def send_email(to_address, subject, message, content="text", attachment_file=None):
    msg = MIMEMultipart()
    msg["From"] = SENDER_ADDRESS
    msg["To"] = to_address
    msg["Subject"] = subject
    if content == "html":      
        msg.attach(MIMEText(message, "html"))
    else:
        msg.attach(MIMEText(message, "plain"))
        
    if attachment_file:
        with open(attachment_file, "rb") as attachment:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment.read())
            encoders.encode_base64(part)

    s = smtplib.SMTP(host=SMPTP_SERVER_HOST, port=SMPTP_SERVER_PORT)
    s.login(SENDER_ADDRESS, SENDER_PASSWORD)
    s.send_message(msg)
    s.quit()
    return True

# Celery task to send reminder emails
@celery.task()
def send_reminer_via_email():
    # Query the User and transaction tables
    all_users = user_model.query.all()

    for user in all_users:
        transactions = UserTransaction.query.filter_by(username=user.username).all()
        if transactions:
            email_content = render_template_string(
                """
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                        }
                        h2 {
                            color: #333;
                        }
                        ul {
                            list-style-type: none;
                            padding: 0;
                        }
                        li {
                            margin-bottom: 10px;
                        }
                    </style>
                </head>
                <body>
                    <h2>Your Recent Booking Details</h2>
                    <p>Hello {{ user.username }},</p>
                    <p>Here are your recent transactions:</p>
                    <ul>
                        {% for transaction in transactions %}
                        <li>
                            <strong>Product Name:</strong> {{ transaction.product_name }}<br>
                            <strong>Rate per Unit:</strong> {{ transaction.product_rate_per_unit }}<br>
                            <strong>Quantity:</strong> {{ transaction.transaction_qty }}<br>
                            <strong>Amount:</strong> {{ transaction.amount }}<br>
                            <strong>Transaction Date:</strong> {{ transaction.transaction_date }}
                        </li>

                            <br>
                        {% endfor %}
                    </ul>
                </body>
                </html>
                """,
                user=user,
                transactions=transactions,
            )

            send_email(
                to_address=user.email,
                subject="Your Recent transaction Details",
                message=email_content,
                content="html",
            )
    
    return "Reminder emails sent successfully"

@app.before_request
def create_db():
    db.create_all()

    if not user_datastore.find_role('admin'):
        admin_role = user_datastore.create_role(name='admin', description='Admin role')
        db.session.commit()

    if not user_datastore.find_role('store_manager'):
        store_manager_role = user_datastore.create_role(name='store_manager', description='Store manager role')
        db.session.commit()

    if not user_datastore.find_user(email='admin@example.com'):
        admin_user = user_datastore.create_user(email='admin@example.com', username='admin', password='admin123')
        user_datastore.add_role_to_user(admin_user, admin_role)
        db.session.commit()

    if not user_datastore.find_user(email='storemanager@example.com'):
        store_manager_user = user_datastore.create_user(email='storemanager@example.com', username='store_manager', password='manager@123')
        user_datastore.add_role_to_user(store_manager_user, store_manager_role)
        db.session.commit()


@app.route("/trigger_celery_job")
def celery_job():
    username = current_user.username
    a=generate_csv.delay(username)
    return jsonify({"Task_id": a.id})

@app.route("/trigger_section_celery_job")
def section_export():
    id = request.args.get("id")
    a=generate_section_csv.delay(id)
    return jsonify({"Task_id":a.id})

@app.route("/status/<int:id>")
def check_status(id):
    res=AsyncResult(id)
    return{
        "Task_id":res.id,
        "Task_state":res.state,
        "Task_result":res.result
    }

@app.route("/download_file")
def download_file():
    time.sleep(5)
    return send_file("static/data.csv")
   
@app.route("/download/csv/section")
def download_csv_section():
    time.sleep(5)
    return send_file("static/sectionData.csv")


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/api/get_user_role', methods=['GET'])
def get_user_role():
    if current_user.has_role('admin'):
        return jsonify({'role': 'admin'}), 200
    elif current_user.has_role('store_manager'):
        return jsonify({'role': 'store_manager'}), 200
    else:
        return jsonify({'role': 'user'}), 200

@app.route('/api/get_user_name', methods=['GET'])
def get_user_info():
    if current_user.is_authenticated:
        user_id = current_user.id
        user_name = current_user.username
        return jsonify({'user_id': user_id, 'username': user_name}), 200
    else:
        return jsonify({'message': 'User not authenticated'}), 401

@app.route('/api/register', methods=['POST'])
def register():
    email = request.json.get('email')
    username = request.json.get('username')
    password = request.json.get('password')

    # Perform validation checks
    if not email or not username or not password:
        return jsonify({'message': 'Missing required fields'}), 400

    # Check if the user with the provided email already exists
    existing_user = user_model.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'message': 'User with this email already exists'}), 409

    # Check if the role with the name 'user' exists, and create one if not
    user_role = Role.query.filter_by(name='user').first()
    if not user_role:
        user_role = Role(name='user', description='Normal user role')
        db.session.add(user_role)
        db.session.commit()

    # Create a new user with the 'user' role
    new_user = user_model(email=email, username=username, password=password, active=1, roles=[user_role])
    # new_user = user_model(email=email, username=username, password=password, roles=[user_role])

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201


@app.route("/api/create_section", methods=["POST"])
@roles_accepted('admin', 'store_manager')
def api_create_section():
    section_name = request.json.get("section_name")
    section_description = request.json.get("section_description")
    s1 = Section(section_name=section_name, section_description=section_description)
    db.session.add(s1)
    db.session.commit()
    return jsonify({"id": s1.section_id, "section_name": s1.section_name, "section_description": s1.section_description})

@app.route("/api/update_section/<int:section_id>", methods=["POST"])
# @cache.cached(timeout=50)
@roles_accepted('admin')
def api_update_section(section_id):
    # Get the section to be updated
    section = Section.query.get(section_id)

    if not section:
        return jsonify({"error": "Section not found"}), 404

    # Update section fields
    section_name = request.json.get("section_name")
    section_description = request.json.get("section_description")

    section.section_name = section_name
    section.section_description = section_description

    db.session.commit()

    return jsonify({
        "id": section.section_id,
        "section_name": section.section_name,
        "section_description": section.section_description
    })




@app.route('/api/all_sections', methods=['GET'])
# @cache.cached(timeout=50)
@roles_accepted('admin', 'user','store_manager')
def api_all_sections():
    sections = Section.query.all()
    return jsonify([{"section_id": s.section_id, 'section_name': s.section_name, 'section_description': s.section_description} for s in sections])


@app.route('/api/delete_section/<int:section_id>', methods=['DELETE'])
@roles_accepted('admin')
def delete_section(section_id):
    try:
        # Fetch the section
        section = Section.query.get(section_id)

        # Check if the section exists
        if not section:
            return jsonify({'error': 'Section not found'}), 404

        # Delete associated products
        products = Product.query.filter_by(section_id=section_id).all()
        for product in products:
            db.session.delete(product)

        # Delete the section
        db.session.delete(section)
        db.session.commit()

        return jsonify({'message': 'Section and associated products deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    

@app.route("/api/edit_section/<int:section_id>", methods=(["POST"]))
@roles_accepted('admin')
def api_edit_section(section_id):
    section = Section.query.filter_by(section_id=section_id).first()
    if not section:
        abort(404)
    section.section_name = request.json["section_name"]
    section.section_description = request.json["section_description"]
    db.session.add(section)
    db.session.commit()
    sec = Section.query.filter_by(section_id=section_id).first()
    return jsonify({"id": sec.section_id, "section_name": sec.section_name, "section_description": sec.section_description})

# Create product route using POST method
@app.route("/api/create_product", methods=["POST"])
@roles_accepted('admin')
def create_product():
    data = request.json
    product_name = data.get('product_name')
    product_description = data.get('product_description')
    product_rate_per_unit = data.get('product_rate_per_unit')
    product_unit = data.get('product_unit')
    product_stock = data.get('product_stock')
    section_name = data.get('section_name')

    # Find the section based on the section name
    section = Section.query.filter_by(section_name=section_name).first()

    if section:
        # Create a new product
        new_product = Product(
            product_name=product_name,
            product_description=product_description,
            product_rate_per_unit=product_rate_per_unit,
            product_unit=product_unit,
            product_stock=product_stock,
            section_id=section.section_id
        )

        db.session.add(new_product)
        db.session.commit()

        return jsonify({
            'product_id': new_product.product_id,
            'product_name': new_product.product_name,
            'product_description': new_product.product_description,
            'product_rate_per_unit': new_product.product_rate_per_unit,
            'product_unit': new_product.product_unit,
            'product_stock': new_product.product_stock,
            'section_id': new_product.section_id
        })
    else:
        return jsonify({'error': 'Section not found'}), 404

# Update product route using PUT method
@app.route("/api/update_product/<int:product_id>", methods=["PUT"])
@roles_accepted('admin')
def update_product(product_id):
    data = request.json
    product_name = data.get('product_name')
    product_description = data.get('product_description')
    product_rate_per_unit = data.get('product_rate_per_unit')
    product_unit = data.get('product_unit')
    product_stock = data.get('product_stock')
    section_name = data.get('section_name')

    # Find the product to update
    product = Product.query.get(product_id)

    if product:
        # Find the section based on the section name
        section = Section.query.filter_by(section_name=section_name).first()

        if section:
            # Update the product data
            product.product_name = product_name
            product.product_description = product_description
            product.product_rate_per_unit = product_rate_per_unit
            product.product_unit = product_unit
            product.product_stock = product_stock
            product.section_id = section.section_id

            db.session.commit()

            return jsonify({
                'product_id': product.product_id,
                'product_name': product.product_name,
                'product_description': product.product_description,
                'product_rate_per_unit': product.product_rate_per_unit,
                'product_unit': product.product_unit,
                'product_stock': product.product_stock,
                'section_id': product.section_id
            })
        else:
            return jsonify({'error': 'Section not found'}), 404
    else:
        return jsonify({'error': 'Product not found'}), 404

    
@app.route("/api/all_products", methods=["GET"])
def get_available_products():
    # Fetch the list of available products
    products = Product.query.all()
    
    # Prepare the response data
    product_data = [
        {
            "product_id": product.product_id,
            "product_name": product.product_name,
            "product_description": product.product_description,
            "product_rate_per_unit": product.product_rate_per_unit,
            "product_unit": product.product_unit,
            "product_stock": product.product_stock,


            'section_name': get_section_name(product.section_id),  # Add this line
        }
        for product in products
    ]

    return jsonify(product_data)

# Function to get section name based on section_id
def get_section_name(section_id):
    # You'll need to define a function to fetch the section_name based on section_id
    # Modify the code based on how your Section model is structured
    section = Section.query.filter_by(section_id=section_id).first()
    return section.section_name if section else None

@app.route('/api/delete_product/<int:product_id>', methods=['DELETE'])
@roles_accepted('admin')
def delete_product(product_id):
    try:
        # Fetch the product
        product = Product.query.get(product_id)

        # Check if the product exists
        if not product:
            return jsonify({'error': 'Product not found'}), 404

        # Delete the product
        db.session.delete(product)
        db.session.commit()

        return jsonify({'message': 'Product deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    



@app.route('/api/cart/add', methods=['POST'])
def add_to_cart():
    # Get the current authenticated user
    user = current_user

    # Get the product data from the request JSON
    product_data = request.json

    # Extract the necessary data from the product_data
    product_id = product_data.get('product_id')
    product_name = product_data.get('product_name')
    rate_per_unit = product_data.get('product_rate_per_unit')
    quantity = int(product_data.get('quantity'))

    # Check if the product is available in stock
    product = Product.query.get(product_id)
    if not product or product.product_stock < quantity:
        return jsonify({'message': 'Product not available in stock or invalid product'}), 400

    # Perform the cart addition logic here
    # Assuming you have a 'UserCart' model defined with the fields as described above
    cart_item = UserCart(
        username=user.username,
        product_id=product_id,
        product_name=product_name,
        product_rate_per_unit=rate_per_unit,
        product_qty=quantity,
        amount=quantity * rate_per_unit
    )
    db.session.add(cart_item)
    db.session.commit()

    return jsonify({'message': 'Product added to cart successfully'}), 200

@app.route('/api/cart/remove/<int:item_id>', methods=['DELETE'])
def remove_from_cart(item_id):
    # Get the current authenticated user
    user = current_user

    # Check if the cart item belongs to the authenticated user
    cart_item = UserCart.query.get(item_id)
    if not cart_item or cart_item.username != user.username:
        return jsonify({'message': 'Cart item not found or does not belong to the user'}), 400

    # Perform the cart removal logic here
    db.session.delete(cart_item)
    db.session.commit()

    return jsonify({'message': 'Product removed from cart successfully'}), 200

@app.route('/api/cart/update/<int:item_id>', methods=['POST'])
def update_cart_item(item_id):
    try:
        # Get the current authenticated user
        user = current_user

        # Check if the cart item belongs to the authenticated user
        cart_item = UserCart.query.get(item_id)
        if not cart_item or cart_item.username != user.username:
            return jsonify({'message': 'Cart item not found or does not belong to the user'}), 400

        # Parse the request JSON for the new quantity
        data = request.get_json()
        if data is None:
            return jsonify({'message': 'Invalid JSON data'}), 400

        new_quantity = data.get('quantity')
        if new_quantity is not None:
            try:
                # Explicitly convert the new_quantity to an integer
                new_quantity = int(new_quantity)
                if new_quantity <= 0:
                    return jsonify({'message': 'Invalid quantity value'}), 400
            except ValueError:
                return jsonify({'message': 'Invalid quantity value (not an integer)'}), 400
        else:
            return jsonify({'message': 'Quantity not specified'}), 400

        # Update the quantity in the cart_item
        cart_item.product_qty = new_quantity

        # Update the amount based on the new quantity and product rate per unit
        # Assuming you have a Product model with a column 'product_rate_per_unit'
        product_rate_per_unit = Product.query.get(cart_item.product_id).product_rate_per_unit
        cart_item.amount = new_quantity * product_rate_per_unit

        db.session.commit()

        return jsonify({'message': 'Product quantity and amount updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error updating product quantity: {str(e)}'}), 500


@app.route('/api/cart/view', methods=['GET'])
def view_cart():
    # Get the current authenticated user
    user = current_user.username

    # Find all cart entries for the given username
    user_cart = UserCart.query.filter_by(username=user).all()

    if not user_cart:
        # No cart entries found, return a 404 Not Found response
        abort(404)

    # Prepare the response data
    cart_data = [
        {
            'item_id': item.item_id,
            'product_id': item.product_id,
            'product_name': item.product_name,
            'product_rate_per_unit': item.product_rate_per_unit,
            'product_qty': item.product_qty,
            'amount': item.amount,
        }
        for item in user_cart
    ]

    return jsonify(cart_data)

@app.route('/api/cart/addCoupon', methods=['POST'])
def add_coupon():
    try:
        # Get the coupon code from the request
        coupon_code = request.json.get('couponCode')

        # Check if the coupon code is valid (you can replace this with your own logic)
        if coupon_code == 'hardik10':
            # Apply a 10% discount
            discount_percentage = 10
            for item in UserCart:
                item['amount'] -= item['amount'] * (discount_percentage / 100)

            return jsonify({'message': 'Coupon applied successfully', 'discount': discount_percentage}), 200
        else:
            return jsonify({'message': 'Invalid coupon code'}), 400

    except Exception as e:
        return jsonify({'message': f'Error applying coupon: {str(e)}'}), 500


@app.route('/api/transaction/make', methods=['POST'])
def make_transaction():
    # Get the current authenticated user
    user = current_user

    # Find all cart entries for the given username
    cart_items = UserCart.query.filter_by(username=user.username).all()

    # Perform the transaction logic here
    # Assuming you have a 'UserTransaction' model defined with the fields as described above
    for cart_item in cart_items:
        # Check if there is enough stock before processing the transaction
        product = Product.query.get(cart_item.product_id)
        if product and product.product_stock >= cart_item.product_qty:
            # Update the product stock
            product.product_stock -= cart_item.product_qty

            # Create a transaction record
            transaction = UserTransaction(
                username=user.username,
                product_id=cart_item.product_id,
                product_name=cart_item.product_name,
                product_rate_per_unit=cart_item.product_rate_per_unit,
                product_qty=cart_item.product_qty,
                amount=cart_item.amount,
                transaction_date=datetime.utcnow()
            )
            db.session.add(transaction)

            # Clear the user's cart after the transaction
            UserCart.query.filter_by(username=user.username).delete()

            db.session.commit()
        else:
            # If there is not enough stock, return an error response
            return jsonify({'error': 'Not enough stock for product with ID {}'.format(cart_item.product_id)}), 400

    return jsonify({'message': 'Transaction successful!'}), 200

@app.route('/api/order/history', methods=['GET'])
def order_history():
    # Get the current authenticated user
    user = current_user.username

    # Find all order history entries for the given username
    user_order_history = UserTransaction.query.filter_by(username=user).all()

    if not user_order_history:
        # No order history entries found, return a 404 Not Found response
        abort(404)

    # Prepare the response data
    order_history_data = [
        {
            'transaction_id': transaction.id,
            'product_id': transaction.product_id,
            'product_name': transaction.product_name,
            'product_qty': transaction.product_qty,
            'amount': transaction.amount,
            'transaction_date': transaction.transaction_date.strftime('%Y-%m-%d %H:%M:%S'),
        }
        for transaction in user_order_history
    ]

    return jsonify(order_history_data)


@app.route('/api/search_products', methods=['GET'])
# @cache.cached(timeout=50) 
def search_products():
    query = request.args.get('query', '').lower()

    # Fetch products from the database based on the search query
    products = Product.query.filter(Product.product_name.ilike(f'%{query}%')).all()

    # Convert the Product objects to dictionaries
    search_results_dict = [
        {
            'product_id': product.product_id,
            'product_name': product.product_name,
            'product_description': product.product_description,
            'section_name': get_section_name(product.section_id),
            'product_rate_per_unit': product.product_rate_per_unit,
            'product_unit': product.product_unit,
            'product_stock': product.product_stock,
            
        }
        for product in products
    ]

    return jsonify(search_results_dict)


@app.route('/api/search_products_by_section', methods=['GET'])
# @cache.cached(timeout=40) 
def search_products_by_section():
    section_query = request.args.get('query', '').lower()

    # Fetch products from the database based on the section search query
    products = Product.query.join(Section).filter(Section.section_name.ilike(f'%{section_query}%')).all()

    # Convert the Product objects to dictionaries
    search_results_dict = [
        {
            'product_id': product.product_id,
            'product_name': product.product_name,
            'product_description': product.product_description,
            'section_name': get_section_name(product.section_id),
            'product_rate_per_unit': product.product_rate_per_unit,
            'product_unit': product.product_unit,
            'product_stock': product.product_stock,
        }
        for product in products
    ]

    return jsonify(search_results_dict)

# Function to get section name based on section_id
def get_section_name(section_id):
    section = Section.query.filter_by(section_id=section_id).first()
    return section.section_name if section else None


# Function to get section name based on section_id
def get_section_name(section_id):
    # Example: Assuming your Section model has a 'section_name' column
    section = Section.query.filter_by(section_id=section_id).first()
    return section.section_name if section else None



@app.route('/api/search_products_by_rate', methods=['GET'])
def search_products_by_rate():
    query = request.args.get('query', '')

    try:
        # Convert the query parameter to a float
        rate = float(query)
    except ValueError:
        return jsonify({'error': 'Invalid rate value'}), 400

    # Fetch products from the database based on the search query
    products = Product.query.filter(Product.product_rate_per_unit <= rate).all()

    # Convert the Product objects to dictionaries
    search_results_dict = [
        {
            'product_id': product.product_id,
            'product_name': product.product_name,
            'product_description': product.product_description,
            'product_rate_per_unit': product.product_rate_per_unit,
            'product_unit': product.product_unit,
            'product_stock': product.product_stock,
        }
        for product in products
    ]

    return jsonify(search_results_dict)

# Add a new endpoint for searching sections
@app.route('/api/search_sections', methods=['GET'])
# @cache.cached(timeout=60) 

def search_sections():
    query = request.args.get('query', '').lower()

    # Fetch sections from the database based on the search query
    sections = Section.query.filter(Section.section_name.ilike(f'%{query}%')).all()

    # Convert the Section objects to dictionaries
    search_results_dict = [
        {
            'section_id': section.section_id,
            'section_name': section.section_name,
            'section_description': section.section_description,
            # Add other fields as needed
        }
        for section in sections
    ]

    return jsonify(search_results_dict)

if __name__ == "__main__":
    app.run(debug=True)
