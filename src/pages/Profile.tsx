import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useProfile } from '@/hooks/useProfile';
import { useSkills } from '@/hooks/useSkills';
import { useWorkExperience } from '@/hooks/useWorkExperience';
import { useEducation } from '@/hooks/useEducation';
import { useCVs } from '@/hooks/useCVs';
import { 
  ArrowLeft, 
  Plus, 
  Pencil, 
  Trash2, 
  Briefcase, 
  GraduationCap,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { profile, isLoading: profileLoading, updateProfile, isUpdating } = useProfile();
  const { skills, groupedSkills, isLoading: skillsLoading, addSkill, deleteSkill, isAdding, deleteAllSkills } = useSkills();
  const { experiences, isLoading: expLoading, addExperience, updateExperience, deleteExperience, deleteAllExperiences } = useWorkExperience();
  const { education, isLoading: eduLoading, addEducation, updateEducation, deleteEducation, deleteAllEducation } = useEducation();
  const { cvs, deleteAllCVs } = useCVs();
  const [isResetting, setIsResetting] = useState(false);

  // Personal Info State
  const [personalInfo, setPersonalInfo] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    location: profile?.location || '',
  });

  // Skill Dialog State
  const [skillDialog, setSkillDialog] = useState(false);
  const [newSkill, setNewSkill] = useState({
    name: '',
    type: 'technical' as 'technical' | 'soft' | 'language',
    proficiency: 'intermediate',
  });

  // Work Experience Dialog State
  const [expDialog, setExpDialog] = useState(false);
  const [newExp, setNewExp] = useState({
    job_title: '',
    company: '',
    start_date: '',
    end_date: '',
    description: '',
    achievements: [''],
  });

  // Education Dialog State
  const [eduDialog, setEduDialog] = useState(false);
  const [newEdu, setNewEdu] = useState({
    degree: '',
    institution: '',
    field_of_study: '',
    graduation_date: '',
    certifications: [''],
  });

  // Job Preferences State
  const [jobPrefs, setJobPrefs] = useState({
    career_level: profile?.career_level || '',
    preferred_industries: profile?.preferred_industries || [],
    job_types: profile?.job_types || [],
    location_preferences: profile?.location_preferences || [],
    salary_min: profile?.salary_min || '',
    salary_max: profile?.salary_max || '',
  });

  const [industryInput, setIndustryInput] = useState('');
  const [locationInput, setLocationInput] = useState('');

  // Update personal info from profile when loaded
  useState(() => {
    if (profile) {
      setPersonalInfo({
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        location: profile.location || '',
      });
      setJobPrefs({
        career_level: profile.career_level || '',
        preferred_industries: profile.preferred_industries || [],
        job_types: profile.job_types || [],
        location_preferences: profile.location_preferences || [],
        salary_min: profile.salary_min || '',
        salary_max: profile.salary_max || '',
      });
    }
  });

  // Calculate profile completeness
  const calculateCompleteness = () => {
    let score = 0;
    if (profile?.full_name && profile?.email && profile?.phone && profile?.location) score += 20;
    if (skills.length >= 3) score += 20;
    if (experiences.length > 0) score += 20;
    if (education.length > 0) score += 15;
    if (profile?.career_level && jobPrefs.preferred_industries.length > 0 && 
        jobPrefs.job_types.length > 0 && jobPrefs.salary_min) score += 25;
    return score;
  };

  const completeness = calculateCompleteness();

  // Handlers
  const handleUpdatePersonalInfo = () => {
    updateProfile(personalInfo);
  };

  const handleAddSkill = () => {
    if (!newSkill.name.trim()) {
      toast.error('Please enter a skill name');
      return;
    }
    addSkill(newSkill);
    setNewSkill({ name: '', type: 'technical', proficiency: 'intermediate' });
    setSkillDialog(false);
  };

  const handleAddExperience = () => {
    if (!newExp.job_title || !newExp.company || !newExp.start_date) {
      toast.error('Please fill in required fields');
      return;
    }
    const achievements = newExp.achievements.filter(a => a.trim());
    addExperience({ ...newExp, achievements });
    setNewExp({
      job_title: '',
      company: '',
      start_date: '',
      end_date: '',
      description: '',
      achievements: [''],
    });
    setExpDialog(false);
  };

  const handleAddEducation = () => {
    if (!newEdu.degree || !newEdu.institution) {
      toast.error('Please fill in required fields');
      return;
    }
    const certifications = newEdu.certifications.filter(c => c.trim());
    addEducation({ ...newEdu, certifications });
    setNewEdu({
      degree: '',
      institution: '',
      field_of_study: '',
      graduation_date: '',
      certifications: [''],
    });
    setEduDialog(false);
  };

  const handleUpdateJobPrefs = () => {
    updateProfile(jobPrefs);
  };

  const addIndustry = () => {
    if (industryInput.trim() && !jobPrefs.preferred_industries.includes(industryInput)) {
      setJobPrefs({
        ...jobPrefs,
        preferred_industries: [...jobPrefs.preferred_industries, industryInput.trim()],
      });
      setIndustryInput('');
    }
  };

  const removeIndustry = (industry: string) => {
    setJobPrefs({
      ...jobPrefs,
      preferred_industries: jobPrefs.preferred_industries.filter(i => i !== industry),
    });
  };

  const addLocation = () => {
    if (locationInput.trim() && !jobPrefs.location_preferences.includes(locationInput)) {
      setJobPrefs({
        ...jobPrefs,
        location_preferences: [...jobPrefs.location_preferences, locationInput.trim()],
      });
      setLocationInput('');
    }
  };

  const removeLocation = (location: string) => {
    setJobPrefs({
      ...jobPrefs,
      location_preferences: jobPrefs.location_preferences.filter(l => l !== location),
    });
  };

  const toggleJobType = (type: string) => {
    const types = jobPrefs.job_types;
    if (types.includes(type)) {
      setJobPrefs({ ...jobPrefs, job_types: types.filter(t => t !== type) });
    } else {
      setJobPrefs({ ...jobPrefs, job_types: [...types, type] });
    }
  };

  const getProficiencyColor = (level: string) => {
    switch (level) {
      case 'expert': return 'bg-accent text-accent-foreground';
      case 'advanced': return 'bg-primary text-primary-foreground';
      case 'intermediate': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your profile, skills, and job preferences
          </p>
        </div>

        {/* Profile Completeness */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {completeness === 100 ? (
                <CheckCircle2 className="h-5 w-5 text-accent" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              Profile Completeness
            </CardTitle>
            <CardDescription>
              {completeness === 100 
                ? 'Your profile is complete!' 
                : `${completeness}% complete - Complete your profile to get better job matches`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={completeness} className="mb-4" />
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {profile?.full_name && profile?.email ? (
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span>Personal information</span>
              </div>
              <div className="flex items-center gap-2">
                {skills.length >= 3 ? (
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span>At least 3 skills added</span>
              </div>
              <div className="flex items-center gap-2">
                {experiences.length > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span>Work experience added</span>
              </div>
              <div className="flex items-center gap-2">
                {education.length > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span>Education added</span>
              </div>
              <div className="flex items-center gap-2">
                {profile?.career_level && jobPrefs.preferred_industries.length > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span>Job preferences set</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={personalInfo.full_name}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={personalInfo.email}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={personalInfo.phone}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={personalInfo.location}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, location: e.target.value })}
                />
              </div>
            </div>
            <Button 
              onClick={handleUpdatePersonalInfo} 
              disabled={isUpdating}
              className="mt-4"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Skills</CardTitle>
                <CardDescription>Manage your technical and soft skills</CardDescription>
              </div>
              <Dialog open={skillDialog} onOpenChange={setSkillDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Skill
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Skill</DialogTitle>
                    <DialogDescription>Add a new skill to your profile</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="skill_name">Skill Name</Label>
                      <Input
                        id="skill_name"
                        value={newSkill.name}
                        onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                        placeholder="e.g., React, Communication"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="skill_type">Type</Label>
                      <Select
                        value={newSkill.type}
                        onValueChange={(value: 'technical' | 'soft' | 'language') => 
                          setNewSkill({ ...newSkill, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="soft">Soft Skill</SelectItem>
                          <SelectItem value="language">Language</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="skill_proficiency">Proficiency</Label>
                      <Select
                        value={newSkill.proficiency}
                        onValueChange={(value) => setNewSkill({ ...newSkill, proficiency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddSkill} disabled={isAdding}>
                      {isAdding ? 'Adding...' : 'Add Skill'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {skillsLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading skills...</div>
            ) : skills.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No skills added yet. Add your first skill to get started!
              </div>
            ) : (
              <div className="space-y-6">
                {/* Technical Skills */}
                {groupedSkills.technical.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Technical Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {groupedSkills.technical.map((skill) => (
                        <Badge
                          key={skill.id}
                          className={`${getProficiencyColor(skill.proficiency_level)} group relative`}
                        >
                          {skill.skill_name} · {skill.proficiency_level}
                          <button
                            onClick={() => deleteSkill(skill.id)}
                            className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Soft Skills */}
                {groupedSkills.soft.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Soft Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {groupedSkills.soft.map((skill) => (
                        <Badge
                          key={skill.id}
                          className={`${getProficiencyColor(skill.proficiency_level)} group relative`}
                        >
                          {skill.skill_name} · {skill.proficiency_level}
                          <button
                            onClick={() => deleteSkill(skill.id)}
                            className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {groupedSkills.language.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Languages</h3>
                    <div className="flex flex-wrap gap-2">
                      {groupedSkills.language.map((skill) => (
                        <Badge
                          key={skill.id}
                          className={`${getProficiencyColor(skill.proficiency_level)} group relative`}
                        >
                          {skill.skill_name} · {skill.proficiency_level}
                          <button
                            onClick={() => deleteSkill(skill.id)}
                            className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Work Experience */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Work Experience</CardTitle>
                <CardDescription>Your professional work history</CardDescription>
              </div>
              <Dialog open={expDialog} onOpenChange={setExpDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Experience
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Work Experience</DialogTitle>
                    <DialogDescription>Add your professional experience</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="job_title">Job Title *</Label>
                        <Input
                          id="job_title"
                          value={newExp.job_title}
                          onChange={(e) => setNewExp({ ...newExp, job_title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company">Company *</Label>
                        <Input
                          id="company"
                          value={newExp.company}
                          onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start_date">Start Date *</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={newExp.start_date}
                          onChange={(e) => setNewExp({ ...newExp, start_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end_date">End Date</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={newExp.end_date}
                          onChange={(e) => setNewExp({ ...newExp, end_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newExp.description}
                        onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Achievements</Label>
                      {newExp.achievements.map((achievement, index) => (
                        <Input
                          key={index}
                          value={achievement}
                          onChange={(e) => {
                            const newAchievements = [...newExp.achievements];
                            newAchievements[index] = e.target.value;
                            setNewExp({ ...newExp, achievements: newAchievements });
                          }}
                          placeholder="Achievement or responsibility"
                        />
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewExp({ ...newExp, achievements: [...newExp.achievements, ''] })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Achievement
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddExperience}>Add Experience</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {expLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading experience...</div>
            ) : experiences.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No work experience added yet.
              </div>
            ) : (
              <div className="space-y-6">
                {experiences.map((exp, index) => (
                  <div key={exp.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{exp.job_title}</h3>
                            <p className="text-sm text-muted-foreground">{exp.company}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(exp.start_date).toLocaleDateString()} - 
                              {exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'Present'}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteExperience(exp.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {exp.description && (
                          <p className="text-sm mt-2">{exp.description}</p>
                        )}
                        {exp.achievements && exp.achievements.length > 0 && (
                          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                            {exp.achievements.map((achievement, i) => (
                              <li key={i}>{achievement}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Education */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Education</CardTitle>
                <CardDescription>Your educational background</CardDescription>
              </div>
              <Dialog open={eduDialog} onOpenChange={setEduDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Education
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Education</DialogTitle>
                    <DialogDescription>Add your educational background</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="degree">Degree *</Label>
                        <Input
                          id="degree"
                          value={newEdu.degree}
                          onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="institution">Institution *</Label>
                        <Input
                          id="institution"
                          value={newEdu.institution}
                          onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="field_of_study">Field of Study</Label>
                        <Input
                          id="field_of_study"
                          value={newEdu.field_of_study}
                          onChange={(e) => setNewEdu({ ...newEdu, field_of_study: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="graduation_date">Graduation Date</Label>
                        <Input
                          id="graduation_date"
                          type="date"
                          value={newEdu.graduation_date}
                          onChange={(e) => setNewEdu({ ...newEdu, graduation_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Certifications</Label>
                      {newEdu.certifications.map((cert, index) => (
                        <Input
                          key={index}
                          value={cert}
                          onChange={(e) => {
                            const newCerts = [...newEdu.certifications];
                            newCerts[index] = e.target.value;
                            setNewEdu({ ...newEdu, certifications: newCerts });
                          }}
                          placeholder="Certification name"
                        />
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewEdu({ ...newEdu, certifications: [...newEdu.certifications, ''] })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Certification
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddEducation}>Add Education</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {eduLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading education...</div>
            ) : education.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No education added yet.
              </div>
            ) : (
              <div className="space-y-6">
                {education.map((edu, index) => (
                  <div key={edu.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                          <GraduationCap className="h-5 w-5 text-accent" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{edu.degree}</h3>
                            <p className="text-sm text-muted-foreground">{edu.institution}</p>
                            {edu.field_of_study && (
                              <p className="text-sm text-muted-foreground">{edu.field_of_study}</p>
                            )}
                            {edu.graduation_date && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Graduated: {new Date(edu.graduation_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteEducation(edu.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {edu.certifications && edu.certifications.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {edu.certifications.map((cert, i) => (
                              <Badge key={i} variant="outline">{cert}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job Preferences */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Job Preferences</CardTitle>
            <CardDescription>Set your job search preferences for better matches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="career_level">Career Level</Label>
                <Select
                  value={jobPrefs.career_level}
                  onValueChange={(value) => setJobPrefs({ ...jobPrefs, career_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select career level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preferred Industries</Label>
                <div className="flex gap-2">
                  <Input
                    value={industryInput}
                    onChange={(e) => setIndustryInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addIndustry()}
                    placeholder="Add industry"
                  />
                  <Button type="button" onClick={addIndustry}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {jobPrefs.preferred_industries.map((industry) => (
                    <Badge key={industry} variant="secondary">
                      {industry}
                      <button onClick={() => removeIndustry(industry)} className="ml-2">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Job Types</Label>
                <div className="space-y-2">
                  {['full-time', 'part-time', 'contract', 'internship', 'remote'].map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={jobPrefs.job_types.includes(type)}
                        onCheckedChange={() => toggleJobType(type)}
                      />
                      <Label htmlFor={type} className="capitalize cursor-pointer">
                        {type}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location Preferences</Label>
                <div className="flex gap-2">
                  <Input
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                    placeholder="Add location"
                  />
                  <Button type="button" onClick={addLocation}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {jobPrefs.location_preferences.map((location) => (
                    <Badge key={location} variant="secondary">
                      {location}
                      <button onClick={() => removeLocation(location)} className="ml-2">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary_min">Minimum Salary (GHS)</Label>
                  <Input
                    id="salary_min"
                    type="number"
                    value={jobPrefs.salary_min}
                    onChange={(e) => setJobPrefs({ ...jobPrefs, salary_min: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary_max">Maximum Salary (GHS)</Label>
                  <Input
                    id="salary_max"
                    type="number"
                    value={jobPrefs.salary_max}
                    onChange={(e) => setJobPrefs({ ...jobPrefs, salary_max: e.target.value })}
                  />
                </div>
              </div>

              <Button onClick={handleUpdateJobPrefs} disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reset Profile Data */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Reset Profile Data
            </CardTitle>
            <CardDescription>
              Clear all your profile data to start fresh. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg text-sm space-y-2">
                <p className="font-medium">This will permanently delete:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>{skills.length} skills</li>
                  <li>{experiences.length} work experiences</li>
                  <li>{education.length} education entries</li>
                  <li>{cvs.length} uploaded CVs</li>
                </ul>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isResetting}>
                    {isResetting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Resetting...</>
                    ) : (
                      <><Trash2 className="h-4 w-4 mr-2" />Reset All Profile Data</>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your skills, work experience, education, and CV uploads. 
                      This action cannot be undone. You will need to re-upload your CV to rebuild your profile.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        setIsResetting(true);
                        try {
                          await Promise.all([
                            deleteAllSkills(),
                            deleteAllExperiences(),
                            deleteAllEducation(),
                            deleteAllCVs(),
                          ]);
                          toast.success('Profile data cleared successfully. You can now re-upload your CV.');
                        } catch (error: any) {
                          toast.error(`Failed to reset: ${error.message}`);
                        } finally {
                          setIsResetting(false);
                        }
                      }}
                    >
                      Yes, delete everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
