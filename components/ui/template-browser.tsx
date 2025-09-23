'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Play, 
  Search, 
  Star, 
  Users, 
  Clock, 
  Lightbulb,
  Target,
  CheckCircle,
  Copy,
  Phone,
  Layers,
  Shield,
  MoreVertical,
  Eye,
  Zap
} from 'lucide-react'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

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
}

interface TemplateCategory {
  value: string;
  label: string;
  description: string;
  icon: string;
  count: number;
}

interface TemplateBrowserProps {
  onSelectTemplate?: (template: TemplateScenario) => void;
  showQuickStart?: boolean;
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800'
};

const categoryIcons = {
  cold_calling: Phone,
  product_demo: Layers,
  objection_handling: Shield,
  discovery: Search,
  closing: Target,
  follow_up: Users,
  negotiation: Users,
  upselling: Target
};

export function TemplateBrowser({ onSelectTemplate, showQuickStart = true }: TemplateBrowserProps) {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [templates, setTemplates] = useState<TemplateScenario[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateScenario | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadCategories();
  }, []);

  const loadTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedDifficulty !== 'all') params.append('difficulty', selectedDifficulty);
      if (selectedIndustry !== 'all') params.append('industry', selectedIndustry);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/template-scenarios?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/template-scenarios/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory, selectedDifficulty, selectedIndustry, searchTerm]);

  const handleTemplateSelect = (template: TemplateScenario) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    } else {
      setSelectedTemplate(template);
      setIsPreviewOpen(true);
    }
  };

  const handleQuickStart = async (template: TemplateScenario) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to start a simulation",
        variant: "destructive"
      });
      return;
    }

    try {
      // Store scenario data for simulation directly without cloning to user scenarios
      localStorage.setItem('currentScenario', JSON.stringify({
        title: template.title,
        prompt: template.prompt,
        prospectName: template.prospect_name, // Use prospectName to match live-simulation expectations
        voice: template.voice || getDefaultVoiceForTemplate(template),
        isTemplate: true,
        templateId: template.id,
        timestamp: Date.now() // Add timestamp so it doesn't get rejected as stale
      }));

      toast({
        title: "Starting Simulation",
        description: `Beginning "${template.title}" simulation`
      });

      // Navigate to simulation directly
      router.push('/simulation');
    } catch (error) {
      console.error('Error starting simulation:', error);
      toast({
        title: "Error",
        description: "Failed to start simulation",
        variant: "destructive"
      });
    }
  };

  // Helper function to get appropriate voice for each template
  const getDefaultVoiceForTemplate = (template: TemplateScenario): string => {
    // Map templates to appropriate voices based on prospect persona
    const voiceMapping: Record<string, string> = {
      'SaaS Cold Call - IT Director': 'professional-male-us', // Technical, professional male
      'Insurance Cold Call - New Parent': 'casual-female-us', // Young mother, casual
      'CRM Demo - Sales Manager': 'professional-female-us', // Analytical female manager
      'Price Objection - Budget Constraints': 'professional-male-us', // Marketing director
      'Discovery Call - HR Software': 'executive-female-us', // VP level, executive
      'Close - Enterprise Software Deal': 'executive-male-us', // CTO, executive level
      'Real Estate - First-Time Buyer': 'casual-male-us', // Young couple, casual
      'Contract Negotiation - Enterprise Deal': 'professional-female-us' // Procurement, professional
    };

    return voiceMapping[template.title] || 'professional-male-us';
  };

  const handleCloneAndCustomize = async (template: TemplateScenario) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to customize templates",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/template-scenarios/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          userId: user.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store for editing in scenario builder
        localStorage.setItem('editScenario', JSON.stringify({
          id: data.scenarioId,
          title: template.title,
          prompt: template.prompt,
          prospect_name: template.prospect_name, // Keep as prospect_name for scenario builder
          voice: template.voice,
          isTemplateClone: true,
          templateId: template.id
        }));

        toast({
          title: "Template Cloned",
          description: "Template copied to your scenarios for customization"
        });

        router.push('/scenario-builder');
      } else {
        toast({
          title: "Error",
          description: "Failed to clone template",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error cloning template:', error);
      toast({
        title: "Error",
        description: "Failed to clone template",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compressed Hero Bar - Similar to All Simulations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] px-6 py-4 h-20"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Template Scenarios</h1>
          <p className="text-sm text-slate-500">
            Choose from professionally crafted training scenarios
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-semibold text-slate-900">{templates.length}</div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Templates</div>
          </div>
          <Button 
            onClick={() => router.push('/scenario-builder')} 
            className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-4 py-2 rounded-xl font-medium text-sm"
          >
            Create Custom
          </Button>
        </div>
      </motion.div>
      
      {/* Filters - Similar to All Simulations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 rounded-lg border-slate-200 focus:ring-primary"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48 rounded-lg border-slate-200 px-4 py-3 focus:ring-primary">
                <Layers className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label} ({category.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-full sm:w-48 rounded-lg border-slate-200 px-4 py-3 focus:ring-primary">
                <Target className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Beginner</span>
                  </div>
                </SelectItem>
                <SelectItem value="intermediate">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span>Intermediate</span>
                  </div>
                </SelectItem>
                <SelectItem value="advanced">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Advanced</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="w-full sm:w-48 rounded-lg border-slate-200 px-4 py-3 focus:ring-primary">
                <Shield className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                <SelectItem value="saas">SaaS</SelectItem>
                <SelectItem value="real_estate">Real Estate</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="healthcare">Healthcare</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>
      
      {/* Templates Table - Similar to SavedScenarios */}
      {templates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">No templates found</p>
          <p className="text-sm text-slate-400 mt-2">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Title</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Difficulty</TableHead>
                <TableHead className="font-semibold">Duration</TableHead>
                <TableHead className="font-semibold">Usage</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => {
                const IconComponent = categoryIcons[template.category as keyof typeof categoryIcons] || Phone;
                
                return (
                  <TableRow key={template.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold text-slate-900">{template.title}</p>
                        <p className="text-sm text-slate-500 line-clamp-1">{template.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">
                          {template.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className={`${
                          template.difficulty === 'beginner' 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : template.difficulty === 'intermediate'
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}
                      >
                        {template.difficulty.charAt(0).toUpperCase() + template.difficulty.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-600">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {Math.round(template.estimated_duration / 60)} min
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-slate-600">
                          <Users className="h-3 w-3 text-slate-400" />
                          <span className="text-sm">{template.usage_count} uses</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-600">
                          <Star className="h-3 w-3 text-slate-400" />
                          <span className="text-sm">{template.average_score?.toFixed(1) || 'N/A'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {showQuickStart && (
                          <Button
                            size="sm"
                            onClick={() => handleQuickStart(template)}
                            className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-4 py-2 rounded-xl font-medium"
                          >
                            <Zap className="h-4 w-4 mr-1" />
                            Quick Start
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleTemplateSelect(template)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCloneAndCustomize(template)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Clone & Customize
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleQuickStart(template)}>
                              <Play className="h-4 w-4 mr-2" />
                              Start Simulation
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Template Preview Dialog - Keep existing dialog code */}
      {selectedTemplate && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {selectedTemplate.title}
                <Badge className={difficultyColors[selectedTemplate.difficulty as keyof typeof difficultyColors]}>
                  {selectedTemplate.difficulty}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {selectedTemplate.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Key Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-sm font-medium">{Math.round(selectedTemplate.estimated_duration / 60)} min</div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                </div>
                <div className="text-center">
                  <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-sm font-medium">{selectedTemplate.usage_count}</div>
                  <div className="text-xs text-muted-foreground">Times Used</div>
                </div>
                <div className="text-center">
                  <Star className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-sm font-medium">{selectedTemplate.average_score?.toFixed(1) || 'N/A'}</div>
                  <div className="text-xs text-muted-foreground">Avg Score</div>
                </div>
                <div className="text-center">
                  <Target className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-sm font-medium">{selectedTemplate.category.replace('_', ' ')}</div>
                  <div className="text-xs text-muted-foreground">Category</div>
                </div>
              </div>

              {/* Learning Objectives */}
              {selectedTemplate.learning_objectives.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Learning Objectives
                  </h4>
                  <ul className="space-y-1">
                    {selectedTemplate.learning_objectives.map((objective, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {objective}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success Criteria */}
              {selectedTemplate.success_criteria.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Success Criteria
                  </h4>
                  <ul className="space-y-1">
                    {selectedTemplate.success_criteria.map((criteria, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        {criteria}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Scenario Details */}
              <div>
                <h4 className="font-semibold mb-2">Scenario Setup</h4>
                <div className="bg-muted p-4 rounded-lg text-sm">
                  {selectedTemplate.prompt}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button 
                variant="outline"
                onClick={() => handleCloneAndCustomize(selectedTemplate)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Clone & Customize
              </Button>
              <Button onClick={() => handleQuickStart(selectedTemplate)}>
                <Play className="mr-2 h-4 w-4" />
                Start Simulation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}