# 046 Create your own account (invite code)
- /signup: name, password, invite code. Plain HTML form, new-password hint for the iPhone password manager. Signs in straight away.
- Open to anyone with the link (Don's call). Optional env SIGNUP_CODE adds an invite code requirement. Always a normal user, never the owner; the owner is still made by signing in first with APP_PASSCODE.
- Link on the sign-in page: "New here? Create an account".
- Why a code: open sign-up would let any stranger spend the Claude budget.
- Limit: no lockout on wrong codes yet; use a long code.
