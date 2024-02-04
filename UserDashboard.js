const UserDashboard = {
  template: `
    <div>


      <!-- Main content -->
      <div v-if="isLoggedIn" class="container mt-4">
        <h1 class="text-center">Namaste, Welcome to Your Grocery Store Dashboard, {{ username }}</h1>
        {{ bookingConfirmation }}

        <!-- Display user cart -->
        <button @click="toggleUserCart" class="btn btn-primary mt-3">
          {{ showUserCart ? 'Hide Cart' : 'View Cart' }}
        </button>
        <div v-if="showUserCart && userCart.length > 0" class="card mt-3">
          <div class="card-body">
            <h3 class="card-title">Your Cart</h3>
            <ul class="list-group">
              <li v-for="(item, index) in userCart" :key="item.item_id" class="list-group-item">
                <strong>Product:</strong> {{ item.product_name }}<br>
                <strong>Quantity:</strong> {{ item.product_qty }}<br>
                <strong>Rate per Unit:</strong> ₹{{ item.product_rate_per_unit }}<br>
                <strong>Amount:</strong> ₹{{ item.amount }}<br>
                <button @click="removeFromCart(item.item_id)" class="btn btn-danger">Remove from Cart</button>
                <button @click="toggleEditModal(index)" class="btn btn-success ml-2">Edit</button>
              </li>
              </ul>

              <!-- Coupon Code Section -->
              <div class="mt-3">
                <label for="couponCode">Coupon Code:</label>
                <input type="text" id="couponCode" v-model="couponCode" class="form-control" placeholder="Enter your coupon code">
                <button @click="applyCoupon" class="btn btn-info mt-2">Apply Coupon</button>
              </div>
          
              <strong class="mt-3">Total Amount:</strong> ₹{{ totalAmount }}
            </div>
          </div>

        <button @click="trigger_celery_job" class="btn btn-warning mt-3">Download Order Details</button>

        <!-- Add an input for section search -->
        <div class="mt-3">
          <label for="sectionSearch">Search by Section:</label>
          <div class="input-group">
            <input type="text" id="sectionSearch" v-model="sectionSearchQuery" @input="searchBySection" class="form-control" placeholder="Enter section name">
            <div class="input-group-append">
              <button class="btn btn-outline-secondary" type="button">Search</button>
            </div>
          </div>
        </div>
        <div class="mt-3">
          <label for="search">Search by Product Name:</label>
          <div class="input-group">
            <input type="text" id="search" v-model="searchQuery" @input="searchProducts" class="form-control" placeholder="Enter product name">
            <div class="input-group-append">
              <button class="btn btn-outline-secondary" type="button">Search</button>
            </div>
          </div>
        </div>

        <!-- Add an input for product rate -->
        <div class="mt-3">
          <label for="rateSearch">Search by Rate:</label>
          <div class="input-group">
            <input type="number" id="rateSearch" v-model="rateSearchQuery" @input="searchByRate" class="form-control" placeholder="Products under rate">
            <div class="input-group-append">
              <button class="btn btn-outline-secondary" type="button">Search</button>
            </div>
          </div>
        </div>

        <!-- Display all available products -->
        <h3 class="mt-4 text-center">All Products</h3>
        <div v-if="products.length > 0">
          <ul class="list-unstyled">
          <li v-for="product in products" :key="product.product_id" class="border mb-4 p-4">
          <strong>Product ID:</strong> {{ product.product_id }}<br>
          <strong>Product Name:</strong> {{ product.product_name }}<br>
          <strong>Section Name:</strong> {{ product.section_name }}<br> <!-- Add this line -->
          <strong>Description:</strong> {{ product.product_description }}<br>
          <strong>Rate per Unit:</strong> ₹{{ product.product_rate_per_unit }}<br>
          <strong>Unit:</strong> {{ product.product_unit }}<br>
          <strong>Stock:</strong>
              <span v-if="product.product_stock === 0" class="text-danger">Out of Stock</span>
              <span v-else-if="product.product_stock > 0 && product.product_stock <= 10" style="color: orange;">Limited Stock</span>
              <span v-else>{{ product.product_stock }}</span><br>
              <label for="qty">Quantity:</label>
              <input type="number" id="qty" v-model="quantityPerProduct[product.product_id]" required min="1" class="form-control" @input="validateQuantityInput">
              <button @click="addToCart(product.product_id, product.product_name, product.product_rate_per_unit)" class="btn btn-primary mt-2">Add to Cart</button>
            </li>
          </ul>
        </div>

        <!-- Display user's previous orders -->
        <button @click="toggleOrderHistory" class="btn btn-primary mt-3">
          {{ showOrderHistory ? 'Hide Order History' : 'View Order History' }}
        </button>
        <div v-if="showOrderHistory && orderHistory.length > 0" class="card mt-3">
          <div class="card-body">
            <h3 class="card-title">Your Order History</h3>
            <ul class="list-unstyled">
              <li v-for="order in orderHistory" :key="order.transaction_id" class="mb-3">
                <strong>Transaction ID:</strong> {{ order.transaction_id }}<br>
                <strong>Product Name:</strong> {{ order.product_name }}<br>
                <strong>Quantity:</strong> {{ order.product_qty }}<br>
                <strong>Amount:</strong> {{ order.amount }}<br>
                <strong>Date:</strong> {{ order.transaction_date }}<br>
                <hr>
              </li>
            </ul>
          </div>
        </div>

        <!-- Edit Cart Item Modal -->
        <div v-if="showEditModal" class="modal" style="display: block; background: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%;">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-body">
                <label for="editQuantity">Edit Quantity:</label>
                <input type="number" id="editQuantity" v-model="editQuantity" required min="1" class="form-control">
                <button @click="updateCartItem" class="btn btn-primary mt-2">Update</button>
                <button @click="cancelEdit" class="btn btn-danger mt-2 ml-2">Cancel</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Make a transaction -->
        <button @click="makeTransaction" class="btn btn-success mt-3">
          Make Transaction
        </button>
      </div>
      <div v-else>
        <h1 class="text-center">Welcome to the Grocery Store</h1>
        <!-- ... (content for non-logged-in users) -->
      </div>
    </div>
  `,


    data() {
      return {
        username: "",
        bookingConfirmation: null,
        showUserCart: false,
        userCart: [],
        products: [],
        quantityPerProduct: {},
        showOrderHistory: false,
        orderHistory: [],
        showEditModal: false,
        editCartItemIndex: null,
        editQuantity: 1,
        isLoading: true, // Add a loading indicator
        isLoggedIn: false,
        rateSearchQuery: '',
      };
    },

    mounted() {
      this.fetchUsername();
      this.fetchProducts();
      this.fetchOrderHistory();
    },

    mounted() {
      this.fetchUsername();  // Keep this line to fetch the username
    
      // Check if the user is logged in (you may have a different way to do this)
      const authToken = localStorage.getItem("Auth-token");
      this.isLoggedIn = authToken !== null;
    
      if (this.isLoggedIn) {
        // Fetch user-specific data when logged in
        this.fetchProducts();
        this.fetchOrderHistory();
        this.fetchUserCart();
      }
    },

    computed: {
      totalAmount() {
        const total = this.userCart.reduce((total, item) => total + item.amount, 0);
        console.log('userCart:', this.userCart);
        console.log('totalAmount:', total);
        return total;
      },
    },
    

    methods: {
      // Method to fetch the username
      async fetchUsername() {
        try {
          const response = await fetch("/api/username");
          const data = await response.json();

          if (response.ok) {
            this.username = data.username;
          } else {
            console.error("Error fetching username:", data.message);
          }
        } catch (error) {
          console.error("Error fetching username:", error.message);
        }
      },

      applyCoupon() {
        // Check if the entered coupon code is "hardik10"
        if (this.couponCode === "hardik10") {
          // Apply a 10% discount
          const discountPercentage = 10;
          const discount = (discountPercentage / 100) * this.totalAmount;
          
          // Update the totalAmount after applying the discount
          this.totalAmount -= discount;
      
          // Display a message or perform any other actions related to the discount
          console.log(`Discount of ${discountPercentage}% applied!`);
        } else {
          // Handle invalid coupon code
          console.log("Invalid coupon code. Please enter a valid code.");
          // You may want to display an error message to the user
        }
      },
      

      // Method to fetch the list of available products
      async fetchProducts() {
        try {
          const response = await fetch("/api/all_products");
          const data = await response.json();

          if (response.ok) {
            this.products = data;
          } else {
            console.error("Error fetching products:", data.message);
          }
        } catch (error) {
          console.error("Error fetching products:", error.message);
        }
      },

      // Method to toggle the visibility of the user cart
      viewCart() {
        console.log("View Cart button clicked!");
        this.showCart = !this.showCart;
      },


    // Method to add an item to the cart
  async addToCart(productId, productName, ratePerUnit) {
    try {
      // Validate if quantity is specified
      const quantity = this.quantityPerProduct[productId];
      if (quantity === undefined || quantity <= 0) {
        console.error("Quantity not specified or invalid");
        return;
      }

      const response = await fetch("/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: productId,
          product_name: productName,
          product_rate_per_unit: ratePerUnit,
          quantity: quantity,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log(data.message);
      } else {
        console.error("Error adding item to cart:", data.message);
      }
    } catch (error) {
      console.error("Error adding item to cart:", error.message);
    }
  },

      // Method to remove an item from the cart
      async removeFromCart(itemId) {
        try {
          const response = await fetch(`/api/cart/remove/${itemId}`, {
            method: "DELETE",
          });
          const data = await response.json();

          if (response.ok) {
            console.log(data.message);
            // Refresh the user cart after removal
            this.fetchUserCart();
          } else {
            console.error("Error removing item from cart:", data.message);
          }
        } catch (error) {
          console.error("Error removing item from cart:", error.message);
        }
      },

      // Method to validate the quantity input
      validateQuantityInput() {
        // Your implementation for quantity validation (if needed)
      },

      async searchProducts() {
        try {
          // Ensure there is a search query
          if (this.searchQuery.trim()) {
            const response = await fetch(`/api/search_products?query=${this.searchQuery}`);
            const data = await response.json();
      
            if (response.ok) {
              // Assuming the API response contains a list of products
              this.products = data.map(product => ({
                product_id: product.product_id,
                product_name: product.product_name,
                product_description: product.product_description,
                
                product_rate_per_unit: product.product_rate_per_unit,
                product_unit: product.product_unit,
                product_stock: product.product_stock,
                // Add other fields as needed
              }));
            } else {
              console.error("Error fetching products:", data.message);
            }
          } else {
            // If the search query is empty, reset the products to the original list
            this.fetchProducts();
          }
        } catch (error) {
          console.error("Error fetching products:", error.message);
        }
      },

      async searchBySection() {
        try {
          // Ensure there is a section search query
          if (this.sectionSearchQuery.trim()) {
            const response = await fetch(`/api/search_products_by_section?query=${this.sectionSearchQuery}`);
            const data = await response.json();
      
            if (response.ok) {
              // Assuming the API response contains a list of products
              this.products = data.map(product => ({
                product_id: product.product_id,
                product_name: product.product_name,
                product_description: product.product_description,
                product_rate_per_unit: product.product_rate_per_unit,
                product_unit: product.product_unit,
                product_stock: product.product_stock,
                // Add other fields as needed
              }));
            } else {
              console.error("Error fetching products by section:", data.message);
            }
          } else {
            // If the section search query is empty, reset the products to the original list
            this.fetchProducts();
          }
        } catch (error) {
          console.error("Error fetching products by section:", error.message);
        }
      },

      async searchByRate() {
        try {
          // Ensure there is a search query
          if (this.rateSearchQuery.trim()) {
            const response = await fetch(`/api/search_products_by_rate?query=${this.rateSearchQuery}`);
            const data = await response.json();
    
            if (response.ok) {
              // Assuming the API response contains a list of products
              this.products = data.map(product => ({
                product_id: product.product_id,
                product_name: product.product_name,
                product_description: product.product_description,
                product_rate_per_unit: product.product_rate_per_unit,
                product_unit: product.product_unit,
                product_stock: product.product_stock,
                section_id: product.section_id,
                // Add other fields as needed
                
              }));
            } else {
              console.error("Error fetching products by rate:", data.message);
            }
          } else {
            // If the search query is empty, reset the products to the original list
            this.fetchProducts();
          }
        } catch (error) {
          console.error("Error fetching products by rate:", error.message);
        }
      },


      // Method to make a transaction
      async makeTransaction() {
        try {
          const response = await fetch("/api/transaction/make", {
            method: "POST",
          });
          const data = await response.json();

          if (response.ok) {
            console.log(data.message);
            // Refresh the user cart after the transaction
            this.fetchUserCart();
          } else {
            console.error("Error making transaction:", data.message);
          }
        } catch (error) {
          console.error("Error making transaction:", error.message);
        }
      },

      fetchUsername() {
        const authToken = localStorage.getItem("Auth-token");
        if (authToken) {
          fetch("/api/get_user_name", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
          })
            .then((response) => response.json())
            .then((data) => {
              this.username = data.username;
              this.id = data.user_id;
            })
            .catch((error) => {
              console.error("Error:", error);
            });
        }
      },

      validateQuantityInput(productId) {
        // Ensure the input value is greater than or equal to 1
        if (this.quantityPerProduct[productId] < 1) {
          this.quantityPerProduct[productId] = 1;
        }
      },

      searchSections() {
        const query = this.searchQuery.query.trim();
        const searchOption = this.searchOption;

        if (query) {
          let queryParam;
          if (searchOption === "name") {
            queryParam = `product_name=${query}`;
          } else if (searchOption === "description") {
            queryParam = `product_description=${query}`;
          }

          fetch(`/api/search_sections?${queryParam}`)
            .then((response) => response.json())
            .then((data) => {
              this.searchResults = data;
            })
            .catch((error) => {
              console.error(error);
            });
        } else {
          this.searchResults = [];
        }
      },

      async fetchUserCart() {
        try {
          const authToken = localStorage.getItem("Auth-token");
          if (authToken) {
            const response = await fetch("/api/cart/view", {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
              },
            });

            if (response.ok) {
              const data = await response.json();
              this.userCart = data;
            } else {
              console.error("Error fetching user cart:", response.statusText);
            }
          }
        } catch (error) {
          console.error("Error fetching user cart:", error.message);
        }
      },

      toggleUserCart() {
        this.showUserCart = !this.showUserCart;
        // If the user cart section is shown, fetch the user cart.
        if (this.showUserCart) {
          this.fetchUserCart();
        } else {
          this.bookingConfirmation = null;
        }
      },

      makePurchase() {
        const authToken = localStorage.getItem("Auth-token");
        if (authToken) {
          fetch("/api/transaction/make", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
          })
            .then((response) => response.json())
            .then((data) => {
              this.bookingConfirmation = data.message;
              // Refresh the user cart after the purchase
              this.fetchUserCart();
            })
            .catch((error) => {
              console.error("Error making purchase:", error);
            });
        }
      },

      // Method to fetch the user's order history
      async fetchOrderHistory() {
        try {
          const authToken = localStorage.getItem("Auth-token");
          if (authToken) {
            const response = await fetch("/api/order/history", {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
              },
            });

            if (response.ok) {
              const data = await response.json();
              this.orderHistory = data;
            } else {
              console.error("Error fetching order history:", response.statusText);
            }
          }
        } catch (error) {
          console.error("Error fetching order history:", error.message);
        }
      },

      // Method to toggle the visibility of the order history
      toggleOrderHistory() {
        this.showOrderHistory = !this.showOrderHistory;
        // If the order history section is shown, fetch the order history.
        if (this.showOrderHistory) {
          this.fetchOrderHistory();
        }
      },

      // Method to toggle the visibility of the edit modal
      toggleEditModal(index) {
        this.editCartItemIndex = index;
        this.editQuantity = this.userCart[index].product_qty;
        this.showEditModal = !this.showEditModal;
      },

      async updateCartItem() {
        try {
          const itemId = this.userCart[this.editCartItemIndex].item_id;
          const response = await fetch(`/api/cart/update/${itemId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              quantity: this.editQuantity,
            }),
          });
          const data = await response.json();
      
          if (response.ok) {
            // Update the quantity in the userCart array
            this.userCart[this.editCartItemIndex].product_qty = this.editQuantity;
      
            // Recalculate the amount based on the updated quantity and rate per unit
            const ratePerUnit = this.userCart[this.editCartItemIndex].product_rate_per_unit;
            this.userCart[this.editCartItemIndex].amount = this.editQuantity * ratePerUnit;
      
            console.log(data.message);
            // Refresh the user cart after the update
            this.fetchUserCart();
          } else {
            console.error("Error updating item in cart:", data.message);
          }
        } catch (error) {
          console.error("Error updating item in cart:", error.message);
        }
      
        // Close the edit modal
        this.showEditModal = false;
      },
      
      
      // trigger_celery_job: function(){

      //   fetch("/trigger_celery_job").then(r => r.json()).then(d =>{
      //     console.log("celery task details:", d);
      //   })
      // },


      trigger_celery_job: function () {
        fetch(`/trigger_celery_job`).then(r=> r.json()).then(d=>{
          console.log("celery task details:",d);
          window.location.href="/download_file"
        })
      },

      rateBoughtProduct(product_id, product_name) {
        const rating = prompt(`Please rate ${product_name} (1-5):`);
      
        if (rating >= 1 && rating <= 5) {
          const authToken = localStorage.getItem('Auth-token');
          if (authToken) {
            fetch(`/api/rating/${product_id}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
              },
              body: JSON.stringify({ rating: rating }),
            })
              .then(response => response.json())
              .then(data => {
                console.log(data); 
                this.msgg = data.message;
                // Assuming you have a function fetchBoughtProducts to refresh the list of bought products
                this.fetchBoughtProducts();
              })
              .catch(error => {
                console.error('Error:', error);
              });
          }
        } else {
          alert('Please enter a valid rating between 1 and 5.');
        }
      },

      computed: {
        totalAmount() {
          const total = this.userCart.reduce((total, item) => total + item.amount, 0);
          console.log('userCart:', this.userCart);
          console.log('totalAmount:', total);
          return total;
        },
      },
      
      
    
      // Method to cancel the edit and close the edit modal
      cancelEdit() {
        this.showEditModal = false;
      },
    },
  };

  export default UserDashboard;
