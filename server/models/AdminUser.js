import mongoose from "mongoose";

const adminUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  password: {
    type: String,
  },
  refreshToken: {
    type: String,
  },
});

const AdminUser = mongoose.model("AdminUser", adminUserSchema);
export default AdminUser;
