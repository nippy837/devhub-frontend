export function validateAuthFields({ username, password, confirmation, registering }) {
  const name = username.trim()
  return {
    username: !name ? '请输入用户名。' : !/^[a-zA-Z0-9_]{3,24}$/.test(name)
      ? '用户名需为 3–24 位英文字母、数字或下划线。' : '',
    password: !password.trim() ? '请输入密码。' : password.length < 8 || password.length > 128
      ? '密码长度需为 8–128 位。' : '',
    confirmation: !registering ? '' : !confirmation ? '请再次输入密码。'
      : confirmation !== password ? '两次输入的密码不一致。' : '',
  }
}
