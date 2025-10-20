import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Upload, ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function UploadCV() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!validTypes.includes(selectedFile.type)) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please upload a PDF, DOCX, or TXT file',
        });
        return;
      }

      if (selectedFile.size > maxSize) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please upload a file smaller than 10MB',
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setIsUploading(true);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // TODO: Call parse-cv edge function
      // For now, just save the CV record
      const { error: dbError } = await supabase
        .from('cvs')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: fileName,
          file_type: file.type,
        });

      if (dbError) throw dbError;

      toast({
        title: 'CV uploaded successfully!',
        description: 'We are parsing your CV. This may take a moment.',
      });

      setFile(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Upload Your CV</h2>
          <p className="text-muted-foreground">
            Upload your CV and let our AI extract your skills, experience, and education
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>CV Upload</CardTitle>
            <CardDescription>
              Supported formats: PDF, DOCX, TXT (Max 10MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary transition-colors">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {file ? file.name : 'Drag and drop your CV here, or click to browse'}
                </p>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  id="cv-upload"
                />
                <label htmlFor="cv-upload">
                  <Button variant="outline" asChild>
                    <span>
                      <FileText className="h-4 w-4 mr-2" />
                      Choose File
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            {file && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload & Parse
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="space-y-2 text-sm text-muted-foreground">
              <h4 className="font-semibold text-foreground">What happens next?</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Your CV will be securely uploaded to your account</li>
                <li>Our AI will analyze and extract key information</li>
                <li>Your profile will be automatically populated</li>
                <li>You can review and edit the extracted information</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
