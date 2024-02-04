// ManagerDashboard.js

const ManagerDashboard = {
  template: `
    <div style="font-family: Arial, sans-serif;">
      <h1 style="font-size: 24px; margin-bottom: 20px;">{{ msg }}</h1>

      <h3>Latest Added Section</h3>
      <p v-if="sections.length > 0">{{ sections[sections.length - 1].section_name }}</p>

      <br><br>

      <h3>Latest Added Product</h3>
      <p v-if="products.length > 0">{{ products[products.length - 1].product_name }}</p>
    </div>
  `,
  data() {
    return {
      sections: [],
      products: [],
      msg: "",
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
  },
  mounted() {
    this.fetchSections();
    this.fetchProducts();
  },
};

export default ManagerDashboard;
