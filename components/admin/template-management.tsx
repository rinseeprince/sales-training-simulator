'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MoreVertical, 
  Play, 
  Eye,
  Star,
  Users,
  TrendingUp
} from 'lucide-react'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useToast } from '@/hooks/use-toast'

interface TemplateScenario {
  id: string;
  title: string;
  prompt: string;
  category: string;
  industry: string | null;
  difficulty: string;
  prospect_name: string | null;
  voice: string | null;
  description: string;
  learning_objectives: string[];
  success_criteria: string[];
  common_objections: string[];
  coaching_tips: string[];
  estimated_duration: number;
  tags: string[];
  usage_count: number;
  average_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'cold_calling', label: 'Cold Calling' },
  { value: 'product_demo', label: 'Product Demo' },
  { value: 'objection_handling', label: 'Objection Handling' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'closing', label: 'Closing' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'upselling', label: 'Upselling' }
];

const INDUSTRIES = [
  { value: 'saas', label: 'SaaS' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'general', label: 'General' }
];

const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }
];

export function TemplateManagement() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateScenario | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    prompt: '',
    category: '',
    industry: '',
    difficulty: '',
    prospect_name: '',
    voice: '',
    description: '',
    learning_objectives: [''],
    success_criteria: [''],
    common_objections: [''],
    coaching_tips: [''],
    estimated_duration: 300,
    tags: ['']
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/template-scenarios');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to load templates",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!user?.id) return;

    try {
      const templateData = {
        ...formData,
        learning_objectives: formData.learning_objectives.filter(obj => obj.trim()),
        success_criteria: formData.success_criteria.filter(criteria => criteria.trim()),
        common_objections: formData.common_objections.filter(obj => obj.trim()),
        coaching_tips: formData.coaching_tips.filter(tip => tip.trim()),
        tags: formData.tags.filter(tag => tag.trim()),
        userId: user.id
      };

      const response = await fetch('/api/template-scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Template created successfully"
        });
        setIsCreateModalOpen(false);
        resetForm();
        loadTemplates();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to create template",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive"
      });
    }
  };

  const handleUpdateTemplate = async () => {
    if (!user?.id || !editingTemplate) return;

    try {
      const response = await fetch(`/api/template-scenarios/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData,
          learning_objectives: formData.learning_objectives.filter(obj => obj.trim()),
          success_criteria: formData.success_criteria.filter(criteria => criteria.trim()),
          common_objections: formData.common_objections.filter(obj => obj.trim()),
          coaching_tips: formData.coaching_tips.filter(tip => tip.trim()),
          tags: formData.tags.filter(tag => tag.trim()),
          userId: user.id 
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Template updated successfully"
        });
        setEditingTemplate(null);
        resetForm();
        loadTemplates();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update template",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/template-scenarios/${templateId}?userId=${user.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Template deactivated successfully"
        });
        loadTemplates();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete template",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      prompt: '',
      category: '',
      industry: '',
      difficulty: '',
      prospect_name: '',
      voice: '',
      description: '',
      learning_objectives: [''],
      success_criteria: [''],
      common_objections: [''],
      coaching_tips: [''],
      estimated_duration: 300,
      tags: ['']
    });
  };

  const openEditModal = (template: TemplateScenario) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      prompt: template.prompt,
      category: template.category,
      industry: template.industry || '',
      difficulty: template.difficulty,
      prospect_name: template.prospect_name || '',
      voice: template.voice || '',
      description: template.description,
      learning_objectives: template.learning_objectives.length ? template.learning_objectives : [''],
      success_criteria: template.success_criteria.length ? template.success_criteria : [''],
      common_objections: template.common_objections.length ? template.common_objections : [''],
      coaching_tips: template.coaching_tips.length ? template.coaching_tips : [''],
      estimated_duration: template.estimated_duration,
      tags: template.tags.length ? template.tags : ['']
    });
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const updateArrayField = (field: keyof typeof formData, index: number, value: string) => {
    const currentArray = formData[field] as string[];
    const newArray = [...currentArray];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const addArrayField = (field: keyof typeof formData) => {
    const currentArray = formData[field] as string[];
    setFormData({ ...formData, [field]: [...currentArray, ''] });
  };

  const removeArrayField = (field: keyof typeof formData, index: number) => {
    const currentArray = formData[field] as string[];
    const newArray = currentArray.filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newArray.length ? newArray : [''] });
  };

  if (loading) {
    return <div className="flex justify-center items-center p-8">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Template Management</h2>
          <p className="text-muted-foreground">Create and manage pre-built scenario templates</p>
        </div>
        <Dialog open={isCreateModalOpen || !!editingTemplate} onOpenChange={(open) => {
          if (!open) {
            setIsCreateModalOpen(false);
            setEditingTemplate(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate ? 'Update the template details below.' : 'Create a new scenario template for users to clone and use.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Template title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prospect_name">Prospect Name</Label>
                  <Input
                    id="prospect_name"
                    value={formData.prospect_name}
                    onChange={(e) => setFormData({ ...formData, prospect_name: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={formData.industry} onValueChange={(value) => setFormData({ ...formData, industry: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map(ind => (
                        <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty *</Label>
                  <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map(diff => (
                        <SelectItem key={diff.value} value={diff.value}>{diff.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of what this template teaches"
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Scenario Prompt *</Label>
                <Textarea
                  id="prompt"
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  placeholder="The AI persona and scenario setup..."
                  className="min-h-[120px]"
                />
              </div>

              <Tabs defaultValue="objectives" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="objectives">Learning Objectives</TabsTrigger>
                  <TabsTrigger value="criteria">Success Criteria</TabsTrigger>
                  <TabsTrigger value="objections">Common Objections</TabsTrigger>
                  <TabsTrigger value="tips">Coaching Tips</TabsTrigger>
                </TabsList>
                
                {['objectives', 'criteria', 'objections', 'tips'].map((tab) => (
                  <TabsContent key={tab} value={tab} className="space-y-2">
                    {(formData[`${tab === 'objectives' ? 'learning_objectives' : 
                                tab === 'criteria' ? 'success_criteria' : 
                                tab === 'objections' ? 'common_objections' : 
                                'coaching_tips'}` as keyof typeof formData] as string[]).map((item, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={item}
                          onChange={(e) => updateArrayField(
                            `${tab === 'objectives' ? 'learning_objectives' : 
                              tab === 'criteria' ? 'success_criteria' : 
                              tab === 'objections' ? 'common_objections' : 
                              'coaching_tips'}` as keyof typeof formData, 
                            index, 
                            e.target.value
                          )}
                          placeholder={`Enter ${tab === 'objectives' ? 'learning objective' : 
                                              tab === 'criteria' ? 'success criteria' : 
                                              tab === 'objections' ? 'common objection' : 
                                              'coaching tip'}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeArrayField(
                            `${tab === 'objectives' ? 'learning_objectives' : 
                              tab === 'criteria' ? 'success_criteria' : 
                              tab === 'objections' ? 'common_objections' : 
                              'coaching_tips'}` as keyof typeof formData, 
                            index
                          )}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addArrayField(
                        `${tab === 'objectives' ? 'learning_objectives' : 
                          tab === 'criteria' ? 'success_criteria' : 
                          tab === 'objections' ? 'common_objections' : 
                          'coaching_tips'}` as keyof typeof formData
                      )}
                    >
                      Add {tab === 'objectives' ? 'Objective' : 
                           tab === 'criteria' ? 'Criteria' : 
                           tab === 'objections' ? 'Objection' : 
                           'Tip'}
                    </Button>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}>
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Templates ({filteredTemplates.length})</CardTitle>
          <CardDescription>
            Manage and monitor your template scenarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{template.title}</p>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {CATEGORIES.find(c => c.value === template.category)?.label || template.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={template.difficulty === 'beginner' ? 'default' : 
                              template.difficulty === 'intermediate' ? 'secondary' : 'destructive'}
                    >
                      {template.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {template.usage_count}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      {template.average_score ? template.average_score.toFixed(1) : 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditModal(template)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteTemplate(template.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}