import { Box, Checkbox, FormHelperText } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner"; // ✅ keep consistent with your other forms
import PrimaryButton from "../components/PrimaryButton"; // if you already have this

const Services = () => {
  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      selectedServices: [],
    },
  });

  const { mutate: register, isLoading: isRegisterLoading } = useMutation({
    mutationFn: async (fd) => {
      console.log("Submitting services array:", fd.selectedServices);
      // const response = await axios.post("/api/company/services", fd);
      // return response.data;
    },
    onSuccess: () => {
      toast.success("Services submitted successfully");
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Something went wrong");
    },
  });

  const onSubmit = (data) => {
    // 👉 here `data.selectedServices` is the final array
    console.log("Selected Services:", data.selectedServices);
    register(data);
  };

  const serviceOptions = [
    {
      category: "Addon Apps (Coming Soon)",
      items: ["Tickets", "Meetings", "Tasks", "Performance", "Visitors", "Assets"],
    },
    {
      category: "Addon Modules (Coming Soon)",
      items: ["Finance", "Sales", "HR", "Admin", "Maintenance", "IT"],
    },
  ];

  return (
    <div className="p-4">
      <h2 className="font-pmedium text-title text-primary ">Please Select Your Services</h2>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Controller
          name="selectedServices"
          control={control}
          defaultValue={["Website Builder", "Lead Generation"]}
          render={({ field, fieldState }) => {
            const mandatoryServices = [
              "Website Builder",
              "Lead Generation",
              "Automated Google Sheets",
            ];

            // Always include mandatory services
            const valueWithMandatory = Array.from(
              new Set([...(field.value || []), ...mandatoryServices])
            );

            const renderCard = (service, isMandatory) => {
              const isSelected = valueWithMandatory.includes(service);

              const handleToggle = () => {
                if (isMandatory) return;
                const newValue = isSelected
                  ? valueWithMandatory.filter((s) => s !== service)
                  : [...valueWithMandatory, service];

                field.onChange(newValue); // update form
              };

              return (
                <Box
                  key={service}
                  onClick={handleToggle}
                  sx={{
                    border: "1px solid",
                    borderColor: isSelected ? "primary.main" : "divider",
                    borderRadius: 2,
                    p: 2,
                    cursor: isMandatory ? "not-allowed" : "pointer",
                    userSelect: "none",
                    boxShadow: isSelected ? 3 : 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: isMandatory ? 0.8 : 1,
                  }}
                >
                  <span className="font-medium">{service}</span>

                  <Checkbox
                    checked={isSelected}
                    disabled={isMandatory}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggle();
                    }}
                  />
                </Box>
              );
            };

            return (
              <Box sx={{ mt: 2 }} className="col-span-1 lg:col-span-2">
                {/* Mandatory Section */}
                <h3 className="font-semibold mb-2">Your Activated Services</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                  {mandatoryServices.map((service) => renderCard(service, true))}
                </div>

                {/* Other Categories */}
                {serviceOptions.map((group) => (
                  <Box key={group.category} sx={{ mb: 4 }}>
                    <h3 className="font-semibold mb-2">{group.category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.items.map((service) => renderCard(service, false))}
                    </div>
                  </Box>
                ))}

                {fieldState.error && (
                  <FormHelperText error>{fieldState.error.message}</FormHelperText>
                )}
              </Box>
            );
          }}
        />

        <div className="flex justify-center items-center mt-6">
          <PrimaryButton
            externalStyles=""
            title="Submit"
            type="submit"
            isLoading={isRegisterLoading}
            disabled={isRegisterLoading}
          />
        </div>
      </form>
    </div>
  );
};

export default Services;
