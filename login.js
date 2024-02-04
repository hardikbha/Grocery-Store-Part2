const login = {
  template: `
    <div>
      <h1 style="text-align: center; margin-top: 20px;">Grocery Store Login</h1>
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 55vh;">
        <form style="border: 2px solid #ccc; padding: 20px; border-radius: 10px; max-width: 300px; margin: 0 auto;">
          <h3 style="text-align: center;">Login Page</h3>
          <h4 style="text-align:center">{{err}}</h4>
          <input type="text" v-model="formData.email" placeholder="Email" style="padding: 8px; border: 1px solid #ccc; border-radius: 5px; width: 100%; margin-bottom: 10px;" />
          <input type="password" v-model="formData.password" placeholder="Password" style="padding: 8px; border: 1px solid #ccc; border-radius: 5px; width: 100%; margin-bottom: 10px;" />
          <button @click.prevent="loginUser" style="padding: 8px 15px;  background-color: #007bff; color: #fff; border: none; border-radius: 5px; cursor: pointer; margin-left: 80px">Login</button>




        </form>
      </div>
    </div>`,
  data() {
    return {
      formData: {
        email: '',
        password: ''
      },
      err: "",
    };
  },
  methods: {
    async loginUser() {
      try {
        const response = await fetch('http://127.0.0.1:5000/login?include_auth_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.formData)
        });

        if (response.ok) {
          const data = await response.json();
          const authToken = data.response.user.authentication_token;
          localStorage.setItem('Auth-token', authToken);
          console.log('Authentication token:', authToken);

          // Fetch user's role
          const roleResponse = await fetch('/api/get_user_role', {
            headers: {
              Authorization: `Bearer ${authToken}`
            }
          });

          if (roleResponse.ok) {
            const roleData = await roleResponse.json();
            const userRole = roleData.role; // Assuming the response returns the user's role
            console.log('User Role:', userRole);

            // Redirect based on the user's role
            if (userRole === 'admin') {
              this.$router.push("/admin_dashboard");
            } else if (userRole === 'store_manager') {
              this.$router.push("/manager_dashboard");
            } else {
              this.$router.push("/user_dashboard");
            }
          } else {
            console.log('Failed to fetch user role:', roleResponse.statusText);
          }
        } else {
          console.log('Login failed:', response.statusText);
          this.err = "Invalid Login Credentials , Try again.";
        }
      } catch (error) {
        console.log('Error:', error);
      }
    }
  }
};

export default login;
