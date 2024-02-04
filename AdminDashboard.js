const AdminDashboard = {
  template: `
    <div style="font-family: Arial, sans-serif;">
      <h1 style="font-size: 24px; margin-bottom: 20px;">{{ msg }}</h1>


      
      <h3>Available Sections of </h3>
      <!-- Search Bar -->
      <div style="margin-top: 20px;">
        <label for="searchSections">Search by Section Name:</label>
        <input type="text" id="search" v-model="sectionSearchQuery" @input="searchSections" placeholder="Enter section name">
        <button>Search</button>
      </div> <br> 

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <th style="padding: 12px; background-color: #007bff; color: #fff;">Section ID</th>
          <th style="padding: 12px; background-color: #007bff; color: #fff;">Section Name</th>
          <th style="padding: 12px; background-color: #007bff; color: #fff;">Description</th>
          <th style="padding: 12px; background-color: #007bff; color: #fff;">Actions</th>
        </tr>
        <tr v-for="section in sections" :key="section.section_id">
          <td style="padding: 12px; text-align:center;">{{ section.section_id }}</td>
          <td style="padding: 12px; text-align:center;">{{ section.section_name }}</td>
          <td style="padding: 12px; text-align:center;">{{ section.section_description }}</td>
          <td style="padding: 12px; text-align:center;">
            <button @click="openEditModal(section)" style="background-color: #007bff; text-align:center;color: #fff; border: none; border-radius: 5px; cursor: pointer;">Edit</button>
            <button @click="confirmSectionDelete(section.section_id)" style="background-color: #dc3545; text-align:center;color: #fff; border: none; border-radius: 5px; cursor: pointer;">Delete</button>
            <button @click="trigger_celery_job(section.section_id)" style="background-color: #dc3545; text-align:center; color: #fff; border: none; border-radius: 5px; cursor: pointer;">Export</button>
          </td>
        </tr>
      </table>

      <div v-if="editModalOpen" class="modal" style="display: block; position: fixed; z-index: 1; padding-top: 100px; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0, 0, 0, 0.4);">
        <div class="modal-content" style="background-color: #fefefe; margin: auto; padding: 20px; border: 1px solid #888; width: 80%;">
          <h3>Edit Section</h3>
          <form @submit.prevent="updateSection">
            <label for="edit-section">Section Name:</label>
            <input type="text" id="edit-section" v-model="editedSection.name" required style="padding: 10px; margin-bottom: 10px;">
            <label for="edit-description">Description:</label>
            <input type="text" id="edit-description" v-model="editedSection.description" required style="padding: 10px; margin-bottom: 10px;">
            <button type="submit" style="padding: 10px 20px; background-color: #007bff; color: #fff; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">Update</button>
            <button type="button" @click="closeEditModal" style="padding: 10px 20px; background-color: #dc3545; color: #fff; border: none; border-radius: 5px; cursor: pointer;">Cancel</button>
          </form>
        </div>
      </div>
      
      <button
        type="button"
        @click="openCreateSectionPopup"
        style="margin-top: 20px; padding: 10px 20px; background-color: #007bff; color: #fff; border: none; border-radius: 5px; cursor: pointer;"
      >
        Create New Section
      </button>

      <div v-if="createSectionPopup" class="modal" style="display: block; position: fixed; z-index: 1; padding-top: 100px; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0, 0, 0, 0.4);">
        <div class="modal-content" style="background-color: #fefefe; margin: auto; padding: 20px; border: 1px solid #888; width: 50%;">
          <h3>Create New Section</h3>
          <form @submit.prevent="createSection">
            <div style="margin-bottom: 10px;">
              <label for="section">Section Name:</label>
              <input type="text" id="section" v-model="newSection.name" required style="padding: 10px;">
            </div>
            <div style="margin-bottom: 10px;">
              <label for="description">Description:</label>
              <input type="text" id="description" v-model="newSection.description" required style="padding: 10px;">
            </div>
            <div style="display: flex; justify-content: space-between;">
              <button type="submit" style="padding: 10px 20px; background-color: #007bff; color: #fff; border: none; border-radius: 5px; cursor: pointer;">Create Section</button>
              <button type="button" @click="closeCreateSectionPopup" style="padding: 10px 20px; background-color: #dc3545; color: #fff; border: none; border-radius: 5px; cursor: pointer;">Cancel</button>
            </div>
          </form>
        </div>
      </div>


      <!-- ... Rest of the code remains the same ... -->

      <br><br>
      <h3>Available Products</h3>

      <!-- Search Bar -->
      <div style="margin-top: 20px;">
        <label for="searchProducts">Search by Product Name:</label>
        <input type="text" id="search" v-model="productSearchQuery" @input="searchProducts" placeholder="Enter product name">
        <button>Search</button>
      </div>
      <br>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <th style="padding: 12px; background-color: #007bff; color: #fff;">Product ID</th>
          <th style="padding: 12px; background-color: #007bff; color: #fff;">Product Name</th>
          <th style="padding: 12px; background-color: #007bff; color: #fff;">Description</th>
          <th style="padding: 12px; background-color: #007bff; color: #fff;">Rate per Unit</th>
          <th style="padding: 12px; background-color: #007bff; color: #fff;">Unit</th>
          <th style="padding: 12px; background-color: #007bff; color: #fff;">Stock</th>
          <th style="padding: 12px; background-color: #007bff; color: #fff;">Section Name</th>
          <th style="padding: 12px; background-color: #007bff; color: #fff;">Actions</th>
        </tr>
        <tr v-for="product in products" :key="product.product_id">
          <td style="padding: 12px; text-align:center;">{{ product.product_id }}</td>
          <td style="padding: 12px; text-align:center;">{{ product.product_name }}</td>
          <td style="padding: 12px; text-align:center;">{{ product.product_description }}</td>
          <td style="padding: 12px; text-align:center;">{{ product.product_rate_per_unit }}</td>
          <td style="padding: 12px; text-align:center;">{{ product.product_unit }}</td>
          <td style="padding: 12px; text-align:center;">{{ product.product_stock }}</td>
          <td style="padding: 12px; text-align:center;">{{ getSectionName(product.section_id) }}</td>
          <td style="padding: 12px; text-align:center;">
            <button @click="openEditProduct(product)" style="background-color: #007bff; color: #fff; border: none; border-radius: 5px; cursor: pointer;">Edit</button>
            <button @click="confirmProductDelete(product.product_id)" style="background-color: #dc3545; color: #fff; border: none; border-radius: 5px; cursor: pointer;">Delete</button>
          </td>
        </tr>
      </table>

      <div v-if="editProductOpen" class="modal" style="display: block; position: fixed; z-index: 1; padding-top: 100px; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0, 0, 0, 0.4);">
        <div class="modal-content" style="background-color: #fefefe; margin: auto; padding: 20px; border: 1px solid #888; width: 80%;">
          <h3>Edit Product</h3>
          <form @submit.prevent="updateProduct">
          <label for="edit-product-name">Product Name:</label>
          <input type="text" id="edit-product-name" v-model="editedProduct.name" required style="padding: 10px; margin-bottom: 10px;">
          
          <label for="edit-product-description">Description:</label>
          <input type="text" id="edit-product-description" v-model="editedProduct.description" required style="padding: 10px; margin-bottom: 10px;">
          
          <label for="edit-rate-per-unit">Rate per Unit:</label>
          <input type="number" id="edit-rate-per-unit" v-model="editedProduct.rate_per_unit" required style="padding: 10px; margin-bottom: 10px;">
          
          <label for="edit-unit">Unit:</label>
          <input type="text" id="edit-unit" v-model="editedProduct.unit" required style="padding: 10px; margin-bottom: 10px;">
          
          <label for="edit-stock">Stock:</label>
          <input type="number" id="edit-stock" v-model="editedProduct.stock" required style="padding: 10px; margin-bottom: 10px;">
        
          <label for="section-name">Section Name:</label>
          <select v-model="editedProduct.section_name" required style="padding: 5px;">
            <option v-for="section in sections" :key="section.section_id" :value="section.section_name">{{ section.section_name }}</option>
          </select>
        
          <button type="submit" style="padding: 10px 20px; background-color: #007bff; color: #fff; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">Update</button>
          <button type="button" @click="closeEditProduct" style="padding: 10px 20px; background-color: #dc3545; color: #fff; border: none; border-radius: 5px; cursor: pointer;">Cancel</button>
        </form>
        
        </div>
      </div>

      <button
        type="button"
        @click="openCreateProductPopup"
        style="margin-top: 20px; padding: 10px 20px; background-color: #007bff; color: #fff; border: none; border-radius: 5px; cursor: pointer;"
      >
        Create New Product
      </button>

      <div v-if="createProductPopup" class="modal" style="display: block; position: fixed; z-index: 1; padding-top: 100px; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0, 0, 0, 0.4);">
        <div class="modal-content" style="background-color: #fefefe; margin: auto; padding: 20px; border: 1px solid #888; width: 50%;">
          <h3>Create New Product</h3>
          <form @submit.prevent="createProduct">
            <div style="margin-bottom: 10px;">
              <label for="product-name">Product Name:</label>
              <input type="text" id="product-name" v-model="newProduct.name" required style="padding: 5px;">
            </div>
            <div style="margin-bottom: 10px;">
              <label for="product-description">Description:</label>
              <input type="text" id="product-description" v-model="newProduct.description" required style="padding: 5px;">
            </div>
            <div style="margin-bottom: 10px;">
              <label for="rate-per-unit">Rate per Unit:</label>
              <input type="number" id="rate-per-unit" v-model="newProduct.rate_per_unit" required style="padding: 5px;">
            </div>
            <div style="margin-bottom: 10px;">
              <label for="unit">Unit:</label>
              <input type="text" id="unit" v-model="newProduct.unit" required style="padding: 5px;">
            </div>
            <div style="margin-bottom: 10px;">
              <label for="stock">Stock:</label>
              <input type="number" id="stock" v-model="newProduct.stock" required style="padding: 5px;">
            </div>

            <div style="margin-bottom: 10px;">
            <label for="section-name">Section Name:</label>
            <select v-model="newProduct.section_name" required style="padding: 5px;">
              <option v-for="section in sections" :key="section.section_id" :value="section.section_name">{{ section.section_name }}</option>
            </select>
            </div>
            <div style="display: flex; justify-content: flex-end;">
              <button
                type="submit"
                style="padding: 10px 20px; background-color: #007bff; color: #fff; border: none; border-radius: 5px; cursor: pointer;"
              >
                Create Product
              </button>
              <button
                type="button"
                @click="closeCreateProductPopup"
                style="padding: 10px 20px; background-color: #dc3545; color: #fff; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;"
              >
                Cancel
              </button>
            </form>
          </div>

          </div>
    
          <!-- ... Rest of the code remains the same ... -->
    
        </div>
      `,
      data() {
        return {
          sections: [],
          products: [],
          msg: "",
          newSection: {
            name: "",
            description: "",
          },
          editedSection: {
            id: null,
            name: "",
            description: "",
          },
          createSectionPopup: false,
          editModalOpen: false,
          newProduct: {
            name: "",
            description: "",
            rate_per_unit: 0,
            unit: "",
            stock: 0,
            section_id: 1,
          },
          editProductOpen: false,
          editedProduct: {
            id: null,
            name: "",
            description: "",
            rate_per_unit: 0,
            unit: "",
            stock: 0,
            section_name: "",
            totalAmount: 0,

          },
          createProductPopup: false,
          sectionSearchQuery: "",
          productSearchQuery: "", 
        };
      },
      methods: {
        fetchSections() {
          fetch("/api/all_sections")
            .then(response => response.json())
            .then(data => {
              this.sections = data;
            })
            .catch(error => {
              console.error("ERROR:", error);
            });
        },

        
        trigger_celery_job: function (sectionId) {
          fetch(`/trigger_section_celery_job?id=${sectionId}`).then(r=> r.json()).then(d=>{
            console.log("celery task details:",d);
            window.location.href="/download/csv/section"
          })
        },

        getSectionName(sectionId) {
          const section = this.sections.find(section => section.section_id === sectionId);
          return section ? section.section_name : "";
        },
        openCreateSectionPopup() {
          this.createSectionPopup = true;
        },
        closeCreateSectionPopup() {
          this.createSectionPopup = false;
          // Clear the input fields
          this.newSection.name = "";
          this.newSection.description = "";
        },
        createSection() {
          fetch("/api/create_section", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              section_name: this.newSection.name,
              section_description: this.newSection.description,
              is_approved: false,
            }),
          })
            .then(response => response.json())
            .then(data => {
              this.sections.push(data);
              this.closeCreateSectionPopup();
            })
            .catch(error => {
              console.error("ERROR:", error);
            });
        },


        openEditModal(section) {
          this.editedSection.id = section.section_id;
          this.editedSection.name = section.section_name;
          this.editedSection.description = section.section_description;
          this.editModalOpen = true;
        },
        closeEditModal() {
          this.editModalOpen = false;
          // Clear the edited section data
          this.editedSection.id = null;
          this.editedSection.name = "";
          this.editedSection.description = "";
        },
        updateSection() {
          fetch(`/api/update_section/${this.editedSection.id}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              section_name: this.editedSection.name,
              section_description: this.editedSection.description,

            }),
          })
            .then(response => response.json())
            .then(data => {
              const index = this.sections.findIndex(section => section.section_id === data.section_id);
              if (index !== -1) {
                this.$set(this.sections, index, data);
              }
              this.closeEditModal();
            })
            .catch(error => {
              console.error("ERROR:", error);
            });
        },
        confirmSectionDelete(sectionId) {
          const confirmDelete = confirm("Are you sure you want to delete this section?");
          if (confirmDelete) {
            this.deleteSection(sectionId);
          }
        },
        deleteSection(sectionId) {
          fetch(`/api/delete_section/${sectionId}`, {
            method: "DELETE",
          })
            .then(response => response.json())
            .then(data => {
              if (data.error) {
                console.error("Error:", data.error);
              } else {
                // Remove the deleted section from the list
                this.sections = this.sections.filter(section => section.section_id !== sectionId);
                // Fetch products again after section deletion
                this.fetchProducts();
              }
            })
            .catch(error => {
              console.error("ERROR:", error);
            });
        },
        
        fetchProducts() {
          fetch("/api/all_products")
            .then(response => response.json())
            .then(data => {
              this.products = data;
            })
            .catch(error => {
              console.error("ERROR:", error);
            });
        },
        openCreateProductPopup() {
          this.createProductPopup = true;
        },
        closeCreateProductPopup() {
          this.createProductPopup = false;
          // Clear the input fields
          this.newProduct.name = "";
          this.newProduct.description = "";
          this.newProduct.rate_per_unit = 0;
          this.newProduct.unit = "";
          this.newProduct.stock = 0;
          this.newProduct.section_id = 1;
        },
        createProduct() {
          fetch("/api/create_product", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
              },
              body: JSON.stringify({
                  product_name: this.newProduct.name,
                  product_description: this.newProduct.description,
                  product_rate_per_unit: this.newProduct.rate_per_unit,
                  product_unit: this.newProduct.unit,
                  product_stock: this.newProduct.stock,
                  section_name: this.newProduct.section_name,
              }),
          })
              .then(response => response.json())
              .then(data => {
                  // Assuming the API response contains section_name as well
                  const productWithSectionName = {
                      ...data,
                      section_name: this.newProduct.section_name,
                  };
                  this.products.push(productWithSectionName);
                  this.closeCreateProductPopup();
              })
              .catch(error => {
                  console.error("ERROR:", error);
              });
      },
        openEditProduct(product) {
          this.editedProduct.id = product.product_id;
          this.editedProduct.name = product.product_name;
          this.editedProduct.description = product.product_description;
          this.editedProduct.rate_per_unit = product.product_rate_per_unit;
          this.editedProduct.unit = product.product_unit;
          this.editedProduct.stock = product.product_stock;
          this.editedProduct.section_name = this.getSectionName(product.section_id); // Set section_name
          this.editProductOpen = true;
        },
        
        closeEditProduct() {
          this.editProductOpen = false;
          // Clear the edited product data
          this.editedProduct.id = null;
          this.editedProduct.name = "";
          this.editedProduct.description = "";
          this.editedProduct.rate_per_unit = 0;
          this.editedProduct.unit = "";
          this.editedProduct.stock = 0;
          this.editedProduct.section_id = 1;
        },
        updateProduct() {
          const { id, name, description, rate_per_unit, unit, stock, section_name } = this.editedProduct;
        
          fetch(`/api/update_product/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              product_name: name,
              product_description: description,
              product_rate_per_unit: rate_per_unit,
              product_unit: unit,
              product_stock: stock,
              section_name: section_name,
            }),
          })
            .then(response => response.json())
            .then(data => {
              const index = this.products.findIndex(product => product.product_id === data.product_id);
              if (index !== -1) {
                this.$set(this.products, index, data);
              }
              this.closeEditProduct();
            })
            .catch(error => {
              console.error("ERROR:", error);
            });
        },

        purchaseProduct(productId) {
          // You may adjust the quantity based on your application
          const quantity = 1;
      
          fetch(`/api/purchase_product/${productId}`, {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
              },
              body: JSON.stringify({
                  quantity: quantity,
              }),
          })
          .then(response => response.json())
          .then(data => {
              console.log(`Product purchased: ${data.product_name}, Quantity: ${quantity}`);
          })
          .catch(error => {
              console.error("ERROR:", error);
          });
      },
        
        
        getSectionIdByName(sectionName) {
          const section = this.sections.find(section => section.section_name === sectionName);
          return section ? section.section_id : null;
        },
        

        async searchProducts() {
          try {
            // Ensure there is a search query
            if (this.productSearchQuery.trim()) {
              const response = await fetch(`/api/search_products?query=${this.sectionSearchQuery}`);
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

        async searchSections() {
          try {
            // Ensure there is a search query
            if (this.sectionSearchQuery.trim()) {
              const response = await fetch(`/api/search_sections?query=${this.sectionSearchQuery}`);
              const data = await response.json();
      
              if (response.ok) {
                // Assuming the API response contains a list of sections
                this.sections = data.map(section => ({
                  section_id: section.section_id,
                  section_name: section.section_name,
                  section_description: section.section_description,
                  // Add other fields as needed
                }));
              } else {
                console.error("Error fetching sections:", data.message);
              }
            } else {
              // If the search query is empty, reset the sections to the original list
              this.fetchSections();
            }
          } catch (error) {
            console.error("Error fetching sections:", error.message);
          }
        },
        

        confirmProductDelete(productId) {
          const confirmDelete = confirm("Are you sure you want to delete this product?");
          if (confirmDelete) {
            this.deleteProduct(productId);
          }
        },

        deleteProduct(productId) {
          fetch(`/api/delete_product/${productId}`, {
            method: "DELETE",
          })
            .then(response => response.json())
            .then(() => {
              this.products = this.products.filter(product => product.product_id !== productId);
            })
            .catch(error => {
              console.error("ERROR:", error);
            });
        },
      },


      mounted() {
        this.fetchSections();
        this.fetchProducts();
      },
    };
    
    export default AdminDashboard;
    