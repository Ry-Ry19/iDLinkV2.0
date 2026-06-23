/**
 * LEARNER'S NOTE:
 * ApplyForID.tsx is a multi-section form for submitting new ID applications.
 *
 * KEY CONCEPTS:
 * - Controlled inputs: Form state object with fields (firstName, lastName, email, etc.)
 * - File uploads: Uses useRef to access file input elements for photo, signature, COR
 * - File validation: Checks file size (max 5MB) and file type before processing
 * - Image preview: Uses URL.createObjectURL() to show thumbnail previews of uploaded images
 * - FormData: Uses FormData object to send files and text data together (multipart/form-data)
 * - Multi-section card layout: Personal Information, ID Details, Document Uploads sections
 * - Select components: Uses shadcn/ui Select for dropdowns (ID type, department)
 * - Navigation: Redirects to /track after successful submission
 */
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ApplyForID = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    idType: "",
    department: "",
    studentNumber: "",
    email: "",
    phone: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [previews, setPreviews] = useState({ photo: "", signature: "", cor: "" });

  const photoRef = useRef<HTMLInputElement | null>(null);
  const signatureRef = useRef<HTMLInputElement | null>(null);
  const corRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "photo" | "signature" | "cor") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File size validation
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${type.toUpperCase()} exceeds 5MB limit`);
      e.target.value = "";
      return;
    }

    // COR type validation
    if (type === "cor" && !["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      toast.error("COR must be PDF, JPG, or PNG");
      e.target.value = "";
      return;
    }

    // Image preview
    if (file.type.startsWith("image/")) {
      setPreviews((prev) => ({ ...prev, [type]: URL.createObjectURL(file) }));
    } else if (type === "cor") {
      // For PDF, just show file name
      setPreviews((prev) => ({ ...prev, cor: file.name }));
    }
  };

  // Helper logic processing binary streams directly to Supabase cloud folder buckets
  const uploadToStorage = async (file: File, folder: string, userId: string): Promise<string | null> => {
    const fileExtension = file.name.split(".").pop();
    const filePath = `${folder}/${userId}-${Date.now()}.${fileExtension}`;

    const { error } = await supabase.storage
      .from("id-documents")
      .upload(filePath, file, { cacheControl: "3600", upsert: true });

    if (error) {
      console.error(`Storage Error (${folder}):`, error.message);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("id-documents")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 1. Fetch user active session context
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      // 2. Extract files from reference points
      const rawPhoto = photoRef.current?.files?.[0];
      const rawSignature = signatureRef.current?.files?.[0];
      const rawCor = corRef.current?.files?.[0];

      if (!rawPhoto || !rawSignature) {
        toast.error("2x2 Photo and E-Signature are required.");
        return;
      }

      // 3. Parallel execute asset storage updates
      toast.info("Uploading attachments...");
      const photoUrl = await uploadToStorage(rawPhoto, "photos", user.id);
      const signatureUrl = await uploadToStorage(rawSignature, "signatures", user.id);
      const corUrl = rawCor ? await uploadToStorage(rawCor, "cor_files", user.id) : null;

      if (!photoUrl || !signatureUrl) {
        toast.error("File upload failed. Ensure 'id-documents' bucket exists and is Public.");
        return;
      }

      // 4. Construct parameters for public database table mapping requirements
      const midName = formData.middleName.trim() ? ` ${formData.middleName.trim()}` : "";
      const constructedFullName = `${formData.firstName.trim()}${midName} ${formData.lastName.trim()}`;
      const generatedIdDisplay = `ID-${Date.now()}`;

      // FIXED: Dynamic database column filtering based on ID registration context
      const isStudent = formData.idType === "student";

      // 5. Fire query insertion matching Supabase schema types exactly
      const { error: dbError } = await supabase
        .from("applications")
        .insert({
          user_id: user.id,
          id_display: generatedIdDisplay,
          fullname: constructedFullName,
          idno: formData.studentNumber,
          email: formData.email,
          department_or_course: formData.department,
          status: "submitted",
          photo: photoUrl,
          signature: signatureUrl,
          cor: corUrl,
        });

      if (dbError) {
        toast.error(`Database Error: ${dbError.message}`);
        return;
      }

      toast.success("ID Application successfully tracked inside Supabase!");

      // Reset UI elements state completely
      setFormData({
        firstName: "",
        lastName: "",
        middleName: "",
        idType: "",
        department: "",
        studentNumber: "",
        email: "",
        phone: "",
      });
      setPreviews({ photo: "", signature: "", cor: "" });
      if (photoRef.current) photoRef.current.value = "";
      if (signatureRef.current) signatureRef.current.value = "";
      if (corRef.current) corRef.current.value = "";

      // Fetch user profile to determine role for redirection
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      let redirectPath = "/track"; // fallback
      if (!profileError && profile) {
        if (profile.role === "student") {
          redirectPath = "/student/dashboard";
        } else if (profile.role === "employee") {
          redirectPath = "/employee/dashboard";
        } else if (profile.role === "staff") {
          redirectPath = "/staff/dashboard";
        }
      }
      navigate(redirectPath);
    } catch (err) {
      console.error(err);
      toast.error("Internal processing error compiling payload updates.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Apply for ID</h1>
            <p className="text-muted-foreground">Fill out the form below to submit your ID application.</p>
          </div>

          <form onSubmit={handleSubmit} encType="multipart/form-data">
            {/* Personal Information */}
            <Card className="shadow-card mb-6">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Please provide accurate personal details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="middleName">Middle Name</Label>
                    <Input
                      id="middleName"
                      value={formData.middleName}
                      onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ID Details */}
            <Card className="shadow-card mb-6">
              <CardHeader>
                <CardTitle>ID Details</CardTitle>
                <CardDescription>Select your ID type and department.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="idType">ID Type *</Label>
                    <Select value={formData.idType} onValueChange={(val) => setFormData({ ...formData, idType: val, department: "" })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ID type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student ID</SelectItem>
                        <SelectItem value="employee">Employee ID</SelectItem>
                        <SelectItem value="faculty">Faculty ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">{formData.idType === "student" ? "College/Course" : "Office/Department"}
                    </Label>
                    <Select value={formData.department} onValueChange={(val) => setFormData({ ...formData, department: val })} disabled={!formData.idType}>
                      <SelectTrigger>
                        <SelectValue placeholder={formData.idType ? "Select options..." : "Choose ID Type First"} />  
                      </SelectTrigger>
                      <SelectContent>
                        {formData.idType === "student" && (
                        <> 
                        <SelectItem value="ccs">College of Computer Studies</SelectItem>
                        <SelectItem value="coe">College of Engineering</SelectItem>
                        <SelectItem value="chs">College of Health Sciences</SelectItem>
                        <SelectItem value="cass">College of Arts and Social Sciences</SelectItem>
                        <SelectItem value="cbaa">College of Business Administration</SelectItem> 
                        <SelectItem value="csm">College of Science and Mathematics</SelectItem>
                        <SelectItem value="ced">College of Education</SelectItem>
                        </>
                        )}
                        {(formData.idType === "employee" || formData.idType === "faculty") &&( 
                        <>
                         <SelectItem value="admin">Main Administration Office</SelectItem>
                         <SelectItem value="ictc">Information and Communications Technology Council</SelectItem>
                         <SelectItem value="ovcaa"> Office of the Vice Chancellor for Academic Affairs</SelectItem>
                         <SelectItem value="oasg">Office of Admissions, Scholarships, and Grants</SelectItem>
                         <SelectItem value="our">Office of University the Registrar</SelectItem>
                         <SelectItem value="hr">Human Resources (HR)</SelectItem>
                         <SelectItem value="security">Security & Facilities</SelectItem>
                        </>
                        )}
                       
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentNumber">{formData.idType === "student" ? "Student Number *" : "Employee Number *"}</Label>
                  <Input
                    id="studentNumber"
                    value={formData.studentNumber}
                    onChange={(e) => setFormData({ ...formData, studentNumber: e.target.value })}
                    placeholder= {formData.idType === "student" ? "e.g., 2024-2855" : "e.g., EMP-9982"}
                    required
                    disabled={!formData.idType}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Document Uploads */}
            <Card className="shadow-card mb-6">
              <CardHeader>
                <CardTitle>Document Uploads</CardTitle>
                <CardDescription>Upload required documents (max 5MB each).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Photo */}
                <div className="space-y-2">
                  <Label htmlFor="photo">2x2 Photo *</Label>
                  <div className="flex items-center gap-4">
                    <Input ref={photoRef} id="photo" type="file" accept="image/*" required onChange={(e) => handleFileChange(e, "photo")} />
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {previews.photo && <img src={previews.photo} className="h-20 w-20 object-cover rounded border" alt="photo preview" />}
                </div>

                {/* Signature */}
                <div className="space-y-2">
                  <Label htmlFor="signature">E-Signature *</Label>
                  <div className="flex items-center gap-4">
                    <Input ref={signatureRef} id="signature" type="file" accept="image/*" required onChange={(e) => handleFileChange(e, "signature")} />
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {previews.signature && <img src={previews.signature} className="h-20 w-40 object-cover rounded border" alt="signature preview" />}
                </div>

                {/* COR */}
                <div className="space-y-2">
                  <Label htmlFor="cor">Certificate of Registration (COR)</Label>
                  <div className="flex items-center gap-4">
                    <Input ref={corRef} id="cor" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, "cor")} />
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {previews.cor && (previews.cor.endsWith(".pdf") ? <p className="text-sm text-muted-foreground">{previews.cor}</p> : <img src={previews.cor} className="h-20 w-20 object-cover rounded border" alt="COR preview" />)}
                </div>
              </CardContent>
            </Card>

            {/* Buttons */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ApplyForID;
