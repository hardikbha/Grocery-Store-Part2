const register={
    template:` 
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 66vh;">
    
    <form @submit.prevent="registerUser" style="border: 2px solid #ccc; padding: 20px; border-radius: 10px; max-width: 300px;">
    <h3 style="text-align: center;">Registration</h3>  
    <label for="email" style="display: block; margin-bottom: 5px;">Email:</label>
      <input type="email" id="email" v-model="email" required style="padding: 8px; border: 1px solid #ccc; border-radius: 5px; width: 100%; margin-bottom: 10px;" />
      
      <label for="username" style="display: block; margin-bottom: 5px;">Username:</label>
      <input type="text" id="username" v-model="username" required style="padding: 8px; border: 1px solid #ccc; border-radius: 5px; width: 100%; margin-bottom: 10px;" />

      <label for="password" style="display: block; margin-bottom: 5px;">Password:</label>
      <input type="password" id="password" v-model="password" required style="padding: 8px; border: 1px solid #ccc; border-radius: 5px; width: 100%; margin-bottom: 10px;" />

      <button type="submit" style="padding: 8px 15px; background-color: #007bff; color: #fff; border: none; border-radius: 5px; cursor: pointer;">Register</button>
    </form>
    </div>

   `,

  data() {
    return {
      email: '',
      username: '',
      password: ''
    };
  },
  methods: {
    registerUser() {
      const userData = {
        email: this.email,
        username: this.username,
        password: this.password
      };

      fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })
        .then(response => response.json())
        .then(data => {
          this.$router.push("/")
          console.log(data);
          // Handle successful registration, e.g., show success message or redirect to login page
        })
        .catch(error => {
          console.error(error);
          // Handle registration error, e.g., show error message
        });
    }
  }
};
export default register 