import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSkills } from '@/hooks/useSkills';
import { useWorkExperience } from '@/hooks/useWorkExperience';
import { useEducation } from '@/hooks/useEducation';
import { useCVs } from '@/hooks/useCVs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft, FileText, Loader2, Check, X, AlertTriangle, Edit2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ParsedSkill {
  name: string;
  type: 'technical' | 'soft' | 'language';
  proficiency: string;
  selected: boolean;
}

interface ParsedExperience {
  job_title: string;
  company: string;
  start_date: string;
  end_date: string | null;
  description: string;
  achievements: string[];
  selected: boolean;
}

interface ParsedEducation {
  degree: string;
  institution: string;
  field_of_study: string;
  graduation_date: string;
  certifications: string[];
  selected: boolean;
}

interface ParsedData {
  personal_info: {
    full_name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  skills: ParsedSkill[];
  work_experience: ParsedExperience[];
  education: ParsedEducation[];
  career_level: string;
}

export default function UploadCV() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { skills, deleteAllSkills } = useSkills();
  const { experiences, deleteAllExperiences } = useWorkExperience();
  const { education, deleteAllEducation } = useEducation();
  const { cvs, deleteAllCVs } = useCVs();
  
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [cvId, setCvId] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [replaceMode, setReplaceMode] = useState(true);
  
  const hasExistingData = skills.length > 0 || experiences.length > 0 || education.length > 0 || cvs.length > 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      const maxSize = 10 * 1024 * 1024;

      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Invalid file type. Please upload a PDF, DOCX, or TXT file');
        return;
      }

      if (selectedFile.size > maxSize) {
        toast.error('File too large. Please upload a file smaller than 10MB');
        return;
      }

      setFile(selectedFile);
      setParsedData(null);
      setShowReview(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setIsUploading(true);
    setParsedData(null);
    setShowReview(false);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: cvData, error: dbError } = await supabase
        .from('cvs')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: fileName,
          file_type: file.type,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setCvId(cvData.id);
      toast.success('CV uploaded! Analyzing with AI...');
      setIsUploading(false);
      setIsParsing(true);

      const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-cv', {
        body: { cv_id: cvData.id, user_id: user.id },
      });

      if (parseError) {
        toast.error(`Parsing failed: ${parseError.message}`);
        setIsParsing(false);
        return;
      }

      if (parseData?.success && parseData?.needsReview) {
        // Add selection state to all items
        const dataWithSelection: ParsedData = {
          ...parseData.data,
          skills: parseData.data.skills?.map((s: any) => ({ ...s, selected: true })) || [],
          work_experience: parseData.data.work_experience?.map((e: any) => ({ ...e, selected: true })) || [],
          education: parseData.data.education?.map((e: any) => ({ ...e, selected: true })) || [],
        };
        setParsedData(dataWithSelection);
        setShowReview(true);
        toast.success('CV analyzed! Please review the extracted data below.');
      } else {
        toast.error('Parsing completed with errors');
      }
      
      setIsParsing(false);
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
      setIsUploading(false);
      setIsParsing(false);
    }
  };

  const toggleSkill = (index: number) => {
    if (!parsedData) return;
    const updated = { ...parsedData };
    updated.skills[index].selected = !updated.skills[index].selected;
    setParsedData(updated);
  };

  const toggleExperience = (index: number) => {
    if (!parsedData) return;
    const updated = { ...parsedData };
    updated.work_experience[index].selected = !updated.work_experience[index].selected;
    setParsedData(updated);
  };

  const toggleEducation = (index: number) => {
    if (!parsedData) return;
    const updated = { ...parsedData };
    updated.education[index].selected = !updated.education[index].selected;
    setParsedData(updated);
  };

  const handleSaveReviewed = async () => {
    if (!parsedData || !user || !cvId) return;

    setIsSaving(true);

    try {
      // If replace mode is enabled, clear existing data first
      if (replaceMode && hasExistingData) {
        toast.info('Clearing existing profile data...');
        await Promise.all([
          deleteAllSkills(),
          deleteAllExperiences(),
          deleteAllEducation(),
        ]);
      }

      // Filter only selected items
      const dataToSave = {
        personal_info: parsedData.personal_info,
        career_level: parsedData.career_level,
        skills: parsedData.skills.filter(s => s.selected).map(({ selected, ...rest }) => rest),
        work_experience: parsedData.work_experience.filter(e => e.selected).map(({ selected, ...rest }) => rest),
        education: parsedData.education.filter(e => e.selected).map(({ selected, ...rest }) => rest),
      };

      const { data, error } = await supabase.functions.invoke('parse-cv', {
        body: { 
          cv_id: cvId, 
          user_id: user.id, 
          save_data: true,
          parsed_data: dataToSave 
        },
      });

      if (error) throw error;

      if (data?.success && data?.saved) {
        toast.success(`Profile updated! Added ${data.data.skills_count} skills, ${data.data.work_experience_count} experiences, ${data.data.education_count} education entries.`);
        navigate('/profile');
      } else {
        toast.error('Failed to save data');
      }
    } catch (error: any) {
      toast.error(`Save failed: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'technical': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'soft': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'language': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-muted text-muted-foreground';
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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Upload Your CV</h2>
          <p className="text-muted-foreground">
            Upload your CV and review the extracted data before saving
          </p>
        </div>

        {/* Upload Section */}
        {!showReview && (
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
                  <Button onClick={handleUpload} disabled={isUploading || isParsing}>
                    {isUploading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
                    ) : isParsing ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
                    ) : (
                      <><Upload className="h-4 w-4 mr-2" />Upload & Analyze</>
                    )}
                  </Button>
                </div>
              )}

              {hasExistingData && (
                <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-sm">Replace existing data</p>
                      <p className="text-xs text-muted-foreground">
                        {replaceMode 
                          ? 'Existing skills, experience, and education will be cleared before adding new data'
                          : 'New data will be added to your existing profile'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={replaceMode}
                    onCheckedChange={setReplaceMode}
                  />
                </div>
              )}

              {hasExistingData && (
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  <p className="font-medium mb-1">Current profile data:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>{skills.length} skills</li>
                    <li>{experiences.length} work experiences</li>
                    <li>{education.length} education entries</li>
                    <li>{cvs.length} uploaded CVs</li>
                  </ul>
                </div>
              )}

              <div className="space-y-2 text-sm text-muted-foreground">
                <h4 className="font-semibold text-foreground">What happens next?</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Your CV will be securely uploaded</li>
                  <li>AI will extract skills, experience, and education</li>
                  <li>You'll review and approve the extracted data</li>
                  <li>Only approved items will be saved to your profile</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Review Section */}
        {showReview && parsedData && (
          <div className="space-y-6">
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <CardTitle>Review Extracted Data</CardTitle>
                </div>
                <CardDescription>
                  Please review the information below. Uncheck any items that are incorrect or you don't want to save.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Personal Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <span className="ml-2 font-medium">{parsedData.personal_info.full_name || 'Not found'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <span className="ml-2 font-medium">{parsedData.personal_info.location || 'Not found'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="ml-2 font-medium">{parsedData.personal_info.phone || 'Not found'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Career Level:</span>
                    <Badge variant="outline" className="ml-2 capitalize">{parsedData.career_level}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Skills ({parsedData.skills.filter(s => s.selected).length}/{parsedData.skills.length} selected)</span>
                </CardTitle>
                <CardDescription>Uncheck skills that weren't actually mentioned in your CV</CardDescription>
              </CardHeader>
              <CardContent>
                {parsedData.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {parsedData.skills.map((skill, index) => (
                      <label
                        key={index}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all ${
                          skill.selected 
                            ? getTypeColor(skill.type) 
                            : 'bg-muted/50 text-muted-foreground line-through opacity-50'
                        }`}
                      >
                        <Checkbox
                          checked={skill.selected}
                          onCheckedChange={() => toggleSkill(index)}
                          className="h-3 w-3"
                        />
                        <span className="text-sm">{skill.name}</span>
                        <span className="text-xs opacity-70">({skill.proficiency})</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No skills extracted</p>
                )}
              </CardContent>
            </Card>

            {/* Work Experience */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Work Experience ({parsedData.work_experience.filter(e => e.selected).length}/{parsedData.work_experience.length} selected)
                </CardTitle>
                <CardDescription>Uncheck any positions that are incorrect</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {parsedData.work_experience.length > 0 ? (
                  parsedData.work_experience.map((exp, index) => (
                    <label
                      key={index}
                      className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                        exp.selected ? 'bg-background' : 'bg-muted/50 opacity-50'
                      }`}
                    >
                      <Checkbox
                        checked={exp.selected}
                        onCheckedChange={() => toggleExperience(index)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className={`font-medium ${!exp.selected && 'line-through'}`}>{exp.job_title}</p>
                        <p className="text-sm text-muted-foreground">{exp.company}</p>
                        <p className="text-xs text-muted-foreground">
                          {exp.start_date} - {exp.end_date || 'Present'}
                        </p>
                        {exp.description && (
                          <p className="text-sm mt-2">{exp.description}</p>
                        )}
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No work experience extracted</p>
                )}
              </CardContent>
            </Card>

            {/* Education */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Education ({parsedData.education.filter(e => e.selected).length}/{parsedData.education.length} selected)
                </CardTitle>
                <CardDescription>Uncheck any education entries that are incorrect</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {parsedData.education.length > 0 ? (
                  parsedData.education.map((edu, index) => (
                    <label
                      key={index}
                      className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                        edu.selected ? 'bg-background' : 'bg-muted/50 opacity-50'
                      }`}
                    >
                      <Checkbox
                        checked={edu.selected}
                        onCheckedChange={() => toggleEducation(index)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className={`font-medium ${!edu.selected && 'line-through'}`}>{edu.degree}</p>
                        <p className="text-sm text-muted-foreground">{edu.institution}</p>
                        {edu.field_of_study && (
                          <p className="text-sm text-muted-foreground">{edu.field_of_study}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{edu.graduation_date}</p>
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No education extracted</p>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReview(false);
                  setParsedData(null);
                  setFile(null);
                }}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel & Start Over
              </Button>
              <Button
                onClick={handleSaveReviewed}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  <><Check className="h-4 w-4 mr-2" />Save to Profile</>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
