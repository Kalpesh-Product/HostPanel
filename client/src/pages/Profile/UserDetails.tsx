import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TextField, Avatar, CircularProgress } from "@mui/material";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import useAuth from "../../hooks/useAuth";
import { toast } from "sonner";
import PageFrame from "../../components/Pages/PageFrame";
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";
import {
  isAlphanumeric,
  noOnlyWhitespace,
  isValidEmail,
} from "../../utils/validators";

const UserDetails = () => {
  const axios = useAxiosPrivate();
  const { auth, setAuth } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const empId = auth?.user?.empId ?? "";

  console.log("my profile here", auth.user);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Please select a file before uploading.");
    setUploading(true);

    const formData = new FormData();
    formData.append("profilePic", file);

    try {
      const response = await axios.patch(
        "/api/profile/update-profile/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      toast.success("Profile Image uploaded successfully!");
      setTimeout(() => window.location.reload(), 1000);

      if (response.data.profilePicture?.url) {
        setPreviewUrl(response.data.profilePicture.url);
      }
    } catch (error) {
      toast.error("Failed to upload image.");
      setTimeout(() => window.location.reload(), 1000);
    } finally {
      setUploading(false);
    }
  };

  const user = {
    name: `${auth?.user?.name}`,
    email: auth?.user?.email,
    designation: auth?.user?.designation,
    status: true,
    avatarColor: "#1976d2",
    workLocation: auth?.user?.address,
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const { data: userDetails, isLoading } = useQuery({
    queryKey: ["userDetails"],
    queryFn: async () => {
      const res = await axios.get(`/api/users/fetch-single-user/${empId}`);
      return res.data;
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ mode: "onChange", defaultValues: {} });

  // ⭐ email added to reset
  useEffect(() => {
    if (auth?.user) {
      reset({
        name: auth.user.name || "",
        address: auth.user.address || "",
        email: auth.user.email || "",
      });
    }
  }, [auth?.user, reset]);

  const mutation = useMutation({
    mutationFn: async (updatedData) => {
      return axios.patch(
        `/api/profile/update-profile/${auth?.user?._id}`,
        updatedData
      );
    },
    onSuccess: (res) => {
      toast.success(res.data.message || "Profile updated successfully!");

      setAuth((prev) => ({
        ...prev,
        user: { ...prev.user, ...res.data.data },
      }));

      setEditMode(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user details");
    },
  });

  const { isPending } = mutation;

  const onSubmit = (data, event) => {
    if (!editMode) {
      event?.preventDefault();
      return;
    }

    const payload = { name: data.name, address: data.address };
    mutation.mutate(payload);
  };

  const fields = [
    { name: "name", label: "Full Name", disabled: false },
    { name: "address", label: "Work Address", disabled: false },
    { name: "email", label: "Email", disabled: true }, // ⭐ new read-only field
  ];

  const sections = [
    {
      title: "Personal Information",
      fields: ["name", "address", "email"], // ⭐ include email in section
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="text-title font-pmedium text-primary uppercase">
          My Profile
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-8 w-full border-2 border-gray-200 p-4 rounded-xl">
        <div className="flex gap-6 items-center w-full flex-col md:flex-row">
          <div className="w-40 h-40">
            <Avatar
              style={{
                backgroundColor: user.avatarColor,
                width: "100%",
                height: "100%",
                fontSize: "5rem",
              }}
              src={previewUrl || auth?.user?.profilePicture?.url}
            >
              {!previewUrl &&
                !auth?.user?.profilePicture?.url &&
                user.name?.charAt(0)}
            </Avatar>
          </div>

          <div className=" md:w-96 flex flex-col gap-1">
            <span className="text-title flex items-center gap-3">
              {user.name}
            </span>
            <span className="text-subtitle">{user.designation}</span>

            {previewUrl && (
              <div className=" flex flex-col items-start gap-2">
                <label
                  htmlFor="fileUpload"
                  className="text-primary cursor-pointer underline"
                >
                  Change Image
                </label>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className={`px-4 py-2 rounded-md text-white ${
                    uploading
                      ? "bg-gray-400"
                      : "bg-primary hover:scale-[1.05] transition"
                  }`}
                >
                  {uploading ? "Uploading..." : "Save Image"}
                </button>
              </div>
            )}

            <input
              id="fileUpload"
              type="file"
              accept=".png, .jpg, .jpeg"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex flex-col gap-4 flex-1">
            <div className="flex gap-2">
              <div className="flex flex-col gap-4 text-gray-600 min-w-20">
                <span>Email : </span>
                <span>Work Location : </span>
              </div>
              <div className="flex flex-col gap-4 text-gray-500">
                <span>{user.email}</span>
                <span>{user.workLocation}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <PageFrame>
        <form onSubmit={handleSubmit(onSubmit)}>
          {sections.map((section) => (
            <div key={section.title} className="mb-8">
              <span className="text-subtitle font-pmedium">
                {section.title}
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {section.fields.map((fieldName) => {
                  const fieldConfig = fields.find((f) => f.name === fieldName);
                  if (!fieldConfig) return null;

                  const { name, label, disabled: fieldDisabled } = fieldConfig;
                  const isEditable = editMode && !fieldDisabled;

                  return (
                    <div key={name}>
                      {isEditable ? (
                        <Controller
                          name={name}
                          control={control}
                          rules={{
                            required: !fieldDisabled && `${label} is required`,
                          }}
                          render={({ field, fieldState: { error } }) => (
                            <TextField
                              {...field}
                              size="small"
                              fullWidth
                              label={label}
                              error={!!error}
                              helperText={error?.message}
                            />
                          )}
                        />
                      ) : (
                        <Controller
                          name={name}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              size="small"
                              fullWidth
                              label={label}
                              disabled
                            />
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Buttons */}
          <div className="flex justify-center">
            {!editMode && (
              <PrimaryButton
                title={"Edit"}
                handleSubmit={() => {
                  reset({
                    name: auth.user.name,
                    address: auth.user.address,
                    email: auth.user.email, // ⭐ ensure email resets
                  });
                  setEditMode(true);
                }}
              />
            )}
          </div>

          {editMode && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <PrimaryButton
                title={
                  isPending ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    "Save"
                  )
                }
                disabled={isPending}
              />

              <SecondaryButton
                title={"Cancel"}
                handleSubmit={() => {
                  reset({
                    name: auth.user.name,
                    address: auth.user.address,
                    email: auth.user.email,
                  });
                  setEditMode(false);
                }}
              />
            </div>
          )}
        </form>
      </PageFrame>
    </div>
  );
};

export default UserDetails;
