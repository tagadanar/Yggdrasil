# Page snapshot

```yaml
- alert
- heading "Welcome to Yggdrasil" [level=1]
- paragraph: Sign in to your account
- text: Email address
- textbox "Email address"
- text: Password
- link "Forgot password?":
  - /url: /auth/reset-password
- textbox "Password"
- button "Sign in"
- heading "Quick Demo Login" [level=3]
- button "Admin Account admin@yggdrasil.edu Login →"
- button "Teacher Account teacher@yggdrasil.edu Login →"
- button "Staff Account staff@yggdrasil.edu Login →"
- button "Student Account student@yggdrasil.edu Login →"
```