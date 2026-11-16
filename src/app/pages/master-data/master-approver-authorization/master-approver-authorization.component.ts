import { Component, OnInit, OnDestroy, TemplateRef, ViewChild, HostListener } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { AppService } from 'src/app/shared/service/app.service';
import { TokenStorageService } from 'src/app/core/services/token-storage.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
    selector: 'app-template-approval-authorization',
    templateUrl: './master-approver-authorization.component.html',
    styleUrl: './master-approver-authorization.component.scss'
})
export class MasterApproverAuthorizationComponent implements OnInit, OnDestroy {
    // Properties
    pageSize = 10;
    page = 1;
    searchTerm = '';
    sortColumn = 'id';
    sortDirection: 'asc' | 'desc' = 'asc';
    GodocUser: any;

    listData: any[] = [];
    allData: any[] = [];
    filteredData: any[] = [];
    totalRecords = 0;
    breadCrumbItems!: Array<{}>;
    statusForm!: string;
    idEdit!: number;
    maxSize = 5;
    loading = false;
    
    // Search and filter subjects for debouncing
    private searchSubject = new Subject<string>();
    private filterSubject = new Subject<void>();

    // Filter properties
    filterIsActive: boolean | undefined = undefined;
    filterLineCode = '';
    filterModelType = '';
    filterTemplateName = '';
    filterIsInsertStep: boolean | undefined = undefined;

    // Dropdown options
    modelTypes = [
        { value: 'department', label: 'Department' },
        { value: 'section', label: 'Section' }
    ];

    // Template names for dropdown (loaded from API)
    templateNames: string[] = [];
    availableLineCodes: string[] = [];

    @ViewChild('modalForm') modalForm!: TemplateRef<any>;
    @ViewChild('viewFlowModal') viewFlowModal!: TemplateRef<any>;

    // Form definition with all fields
    public formData = this.fb.group({
        template_name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
        line_code: ['', [Validators.maxLength(50)]],
        step_order: [1, [Validators.required, Validators.min(0)]],
        actor_name: ['', [Validators.required, Validators.maxLength(255)]],
        model_type: ['', [Validators.required]],
        section_id: [null],
        use_dynamic_section: [false],
        use_line_section: [false],
        is_insert_step: [false],
        insert_after_step: [null],
        applies_to_lines: [''],
        is_active: [true],
        priority: [0, [Validators.min(0)]],
        description: ['', [Validators.maxLength(500)]]
    });

    // Approval flow data for viewing
    approvalFlowData: any[] = [];
    selectedLineCodeForFlow = '';

    constructor(
        private service: AppService,
        private fb: FormBuilder,
        private modal: NgbModal,
        private tokenStorage: TokenStorageService,
    ) { }

    get form() {
        return this.formData.controls;
    }

    @HostListener('window:resize', ['$event'])
    onResize(event: any) {
        this.setMaxSize();
    }

    ngOnInit(): void {
        this.GodocUser = this.tokenStorage.getUser();
        console.log("Current User: ", this.GodocUser);

        this.initBreadcrumbs();
        this.setMaxSize();
        this.setupSearchDebounce();
        this.loadDropdownData();
        this.loadAllData();
        this.setupFormWatchers();
    }

    ngOnDestroy(): void {
        this.searchSubject.complete();
        this.filterSubject.complete();
    }

    initBreadcrumbs() {
        this.breadCrumbItems = [
            { label: 'Master Data' }, 
            { label: 'Template Approval Authorization', active: true }
        ];
    }

    setupSearchDebounce() {
        // Setup search debouncing
        this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged()
        ).subscribe(searchTerm => {
            this.searchTerm = searchTerm;
            this.page = 1;
            this.applyFiltersAndSearch();
        });

        // Setup filter debouncing
        this.filterSubject.pipe(
            debounceTime(100)
        ).subscribe(() => {
            this.page = 1;
            this.applyFiltersAndSearch();
        });
    }

    setupFormWatchers() {
        // Watch is_insert_step changes to toggle insert_after_step and applies_to_lines validation
        this.formData.get('is_insert_step')?.valueChanges.subscribe(isInsertStep => {
            const insertAfterStepControl = this.formData.get('insert_after_step');
            const appliesToLinesControl = this.formData.get('applies_to_lines');

            if (isInsertStep) {
                insertAfterStepControl?.setValidators([Validators.required, Validators.min(0)]);
                appliesToLinesControl?.setValidators([Validators.required]);
            } else {
                insertAfterStepControl?.clearValidators();
                appliesToLinesControl?.clearValidators();
                insertAfterStepControl?.setValue(null);
                appliesToLinesControl?.setValue('');
            }
            
            insertAfterStepControl?.updateValueAndValidity();
            appliesToLinesControl?.updateValueAndValidity();
        });
    }

    loadDropdownData() {
        // Load template names
        this.service.get('/approverauthorization/template-names').subscribe({
            next: (result: any) => {
                this.templateNames = result.data || [];
            },
            error: (error) => {
                console.error('Error loading template names:', error);
            }
        });

        // Load available line codes
        this.service.get('/approverauthorization/line-codes').subscribe({
            next: (result: any) => {
                this.availableLineCodes = result.data || [];
            },
            error: (error) => {
                console.error('Error loading line codes:', error);
            }
        });
    }

    loadAllData() {
        this.loading = true;
        
        // Load all data without pagination for frontend filtering
        const url = `/approverauthorization?page=1&limit=10000&sort=${this.sortColumn}&direction=${this.sortDirection}`;

        console.log('Loading all data:', url);

        this.service.get(url).subscribe({
            next: (result: any) => {
                console.log('API Response:', result);
                this.allData = result.data || [];
                this.applyFiltersAndSearch();
                this.loading = false;
            },
            error: (error) => {
                this.handleError(error, 'Error fetching template approval authorization data');
                this.loading = false;
            },
        });
    }

    applyFiltersAndSearch() {
        console.log('Applying filters and search...');
        console.log('Search term:', this.searchTerm);
        console.log('Filters:', {
            isActive: this.filterIsActive,
            lineCode: this.filterLineCode,
            modelType: this.filterModelType,
            templateName: this.filterTemplateName,
            isInsertStep: this.filterIsInsertStep
        });

        let filtered = [...this.allData];

        // 1. Apply status filter (Active/Inactive)
        if (this.filterIsActive !== undefined) {
            filtered = filtered.filter(item => item.is_active === this.filterIsActive);
            console.log(`After status filter (${this.filterIsActive}):`, filtered.length);
        }

        // 2. Apply model type filter
        if (this.filterModelType && this.filterModelType.trim()) {
            filtered = filtered.filter(item => 
                item.model_type && 
                item.model_type.toLowerCase() === this.filterModelType.toLowerCase()
            );
            console.log(`After model type filter (${this.filterModelType}):`, filtered.length);
        }

        // 3. Apply template name filter
        if (this.filterTemplateName && this.filterTemplateName.trim()) {
            filtered = filtered.filter(item => 
                item.template_name && 
                item.template_name.toLowerCase().includes(this.filterTemplateName.toLowerCase())
            );
            console.log(`After template name filter (${this.filterTemplateName}):`, filtered.length);
        }

        // 4. Apply line code specific filter
        if (this.filterLineCode && this.filterLineCode.trim()) {
            const lineCodeSearch = this.filterLineCode.toLowerCase().trim();
            filtered = filtered.filter(item => {
                // Check line_code field
                if (item.line_code && item.line_code.toLowerCase().includes(lineCodeSearch)) {
                    return true;
                }
                // Check applies_to_lines array
                if (item.applies_to_lines && Array.isArray(item.applies_to_lines)) {
                    return item.applies_to_lines.some((line: string) => 
                        line.toLowerCase().includes(lineCodeSearch)
                    );
                }
                return false;
            });
            console.log(`After line code filter (${this.filterLineCode}):`, filtered.length);
        }

        // 5. Apply insert step filter
        if (this.filterIsInsertStep !== undefined) {
            filtered = filtered.filter(item => item.is_insert_step === this.filterIsInsertStep);
            console.log(`After insert step filter (${this.filterIsInsertStep}):`, filtered.length);
        }

        // 6. Apply general search across multiple fields
        if (this.searchTerm && this.searchTerm.trim()) {
            const searchLower = this.searchTerm.toLowerCase().trim();
            console.log('Applying general search:', searchLower);
            
            filtered = filtered.filter(item => {
                if (!item) return false;
                
                // Search in multiple fields
                const searchFields = [
                    item.template_name,
                    item.actor_name,
                    item.description,
                    item.model_type,
                    item.step_order?.toString(),
                    item.priority?.toString()
                ];

                // Add applies_to_lines search
                if (item.applies_to_lines && Array.isArray(item.applies_to_lines)) {
                    searchFields.push(item.applies_to_lines.join(' '));
                }
                
                return searchFields.some(field => {
                    if (field === null || field === undefined) return false;
                    return String(field).toLowerCase().includes(searchLower);
                });
            });
            console.log(`After general search (${this.searchTerm}):`, filtered.length);
        }

        // Apply sorting
        this.applySorting(filtered);

        // Store filtered data
        this.filteredData = filtered;
        this.totalRecords = filtered.length;

        // Apply pagination
        this.applyPagination();

        console.log('Final results:', {
            total: this.totalRecords,
            displayed: this.listData.length,
            page: this.page,
            pageSize: this.pageSize
        });
    }

    applySorting(data: any[]) {
        data.sort((a, b) => {
            let aVal = a[this.sortColumn];
            let bVal = b[this.sortColumn];
            
            // Handle null/undefined values
            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';
            
            // Convert to string for comparison
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
            
            if (this.sortDirection === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });
    }

    applyPagination() {
        const startIndex = (this.page - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.listData = this.filteredData.slice(startIndex, endIndex);

        // Update pagination settings
        const totalPages = Math.ceil(this.totalRecords / this.pageSize);
        this.setMaxSize(totalPages);
    }

    // Event handlers
    onSearchInput(event: any) {
        const value = event.target.value || '';
        this.searchSubject.next(value);
    }

    onFilterChange() {
        this.filterSubject.next();
    }

    onLineCodeFilterChange() {
        this.filterSubject.next();
    }

    clearFilters() {
        this.searchTerm = '';
        this.filterIsActive = undefined;
        this.filterLineCode = '';
        this.filterModelType = '';
        this.filterTemplateName = '';
        this.filterIsInsertStep = undefined;
        this.page = 1;
        
        // Clear the search input field
        const searchInput = document.querySelector('.search') as HTMLInputElement;
        if (searchInput) {
            searchInput.value = '';
        }
        
        this.applyFiltersAndSearch();
    }

    onSort(column: string) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        console.log(`Sorting by ${column} ${this.sortDirection}`);
        this.applyFiltersAndSearch();
    }

    onPageChange(newPage: number): void {
        this.page = newPage;
        this.applyPagination();
    }

    onPageSizeChange() {
        this.page = 1;
        this.applyPagination();
    }

    // Search methods for compatibility
    onSearch() {
        this.page = 1;
        this.applyFiltersAndSearch();
    }

    performSearch() {
        this.applyFiltersAndSearch();
    }

    formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }) + ' ' + date.toLocaleTimeString('en-US');
    }

    getSortIcon(column: string): string {
        if (this.sortColumn !== column) {
            return 'ri-arrow-up-down-line';
        }
        return this.sortDirection === 'asc' ? 'ri-arrow-up-line' : 'ri-arrow-down-line';
    }

    onAction(status: string, data?: any) {
        this.statusForm = status;

        if (status === 'edit' && data) {
            this.formData.setValue({
                template_name: data.template_name || '',
                line_code: data.line_code || '',
                step_order: data.step_order || 1,
                actor_name: data.actor_name || '',
                model_type: data.model_type || '',
                section_id: data.section_id || null,
                use_dynamic_section: data.use_dynamic_section ?? false,
                use_line_section: data.use_line_section ?? false,
                is_insert_step: data.is_insert_step ?? false,
                insert_after_step: data.insert_after_step || null,
                applies_to_lines: data.applies_to_lines ? (Array.isArray(data.applies_to_lines) ? data.applies_to_lines.join(', ') : data.applies_to_lines) : '',
                is_active: data.is_active ?? true,
                priority: data.priority || 0,
                description: data.description || ''
            });
            this.idEdit = data.id;
        } else {
            this.formData.reset({
                template_name: '',
                line_code: '',
                step_order: 1,
                actor_name: '',
                model_type: '',
                section_id: null,
                use_dynamic_section: false,
                use_line_section: false,
                is_insert_step: false,
                insert_after_step: null,
                applies_to_lines: '',
                is_active: true,
                priority: 0,
                description: ''
            });
            this.idEdit = -1;
        }

        this.modal.open(this.modalForm, { size: 'lg', backdrop: 'static', centered: true });
    }

    onSubmit() {
        if (this.formData.invalid) {
            this.formData.markAllAsTouched();
            return;
        }

        const formValues = this.formData.value;
        
        // Process applies_to_lines
        let appliesToLines = null;
        if (formValues.applies_to_lines && formValues.applies_to_lines.trim()) {
            // Split by comma and clean up
            appliesToLines = formValues.applies_to_lines
                .split(',')
                .map((line: string) => line.trim())
                .filter((line: string) => line.length > 0);
        }

        const payload: any = {
            template_name: formValues.template_name,
            line_code: formValues.line_code || null,
            step_order: Number(formValues.step_order),
            actor_name: formValues.actor_name,
            model_type: formValues.model_type,
            section_id: formValues.section_id ? Number(formValues.section_id) : null,
            use_dynamic_section: formValues.use_dynamic_section,
            use_line_section: formValues.use_line_section,
            is_insert_step: formValues.is_insert_step,
            insert_after_step: formValues.insert_after_step ? Number(formValues.insert_after_step) : null,
            applies_to_lines: appliesToLines,
            is_active: formValues.is_active,
            priority: Number(formValues.priority),
            description: formValues.description || null,
        };

        this.loading = true;
        if (this.statusForm === 'add') {
            payload.created_by = this.GodocUser.nik;
            this.service.post('/approverauthorization', payload).subscribe({
                next: () => {
                    Swal.fire('Success', 'Template approval authorization added successfully!', 'success');
                    this.modal.dismissAll();
                    this.refreshData();
                    this.loading = false;
                },
                error: (error: any) => {
                    this.handleError(error, 'Error adding template approval authorization');
                    this.loading = false;
                }
            });
        } else {
            payload.created_by = this.GodocUser.nik;
            this.service.put(`/approverauthorization/${this.idEdit}`, payload).subscribe({
                next: () => {
                    Swal.fire('Success', 'Template approval authorization updated successfully!', 'success');
                    this.modal.dismissAll();
                    this.refreshData();
                    this.loading = false;
                },
                error: (error: any) => {
                    this.handleError(error, 'Error updating template approval authorization');
                    this.loading = false;
                }
            });
        }
    }

    onDelete(id: number) {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.loading = true;
                const payload = { deleted_by: this.GodocUser.nik };
                this.service.delete(`/approverauthorization/${id}`).subscribe({
                    next: () => {
                        Swal.fire(
                            'Deleted!',
                            'Template approval authorization has been deleted.',
                            'success'
                        );
                        this.refreshData();
                        this.loading = false;
                    },
                    error: (error) => {
                        this.handleError(error, 'Error deleting template approval authorization');
                        this.loading = false;
                    }
                });
            }
        });
    }

    onToggleStatus(id: number) {
        Swal.fire({
            title: 'Toggle Status',
            text: "Are you sure you want to change the status?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, toggle it!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.loading = true;
                const payload = { updated_by: this.GodocUser.nik };
                this.service.patch(`/approverauthorization/${id}/toggle-status`, payload).subscribe({
                    next: (response: any) => {
                        Swal.fire('Success', response.message, 'success');
                        this.refreshData();
                        this.loading = false;
                    },
                    error: (error: any) => {
                        this.handleError(error, 'Error toggling status');
                        this.loading = false;
                    }
                });
            }
        });
    }

    // View approval flow for a specific line code
    onViewApprovalFlow(lineCode?: string) {
        if (!lineCode) {
            // Show input dialog for line code
            Swal.fire({
                title: 'Enter Line Code',
                input: 'select',
                inputOptions: this.availableLineCodes.reduce((options: any, code: string) => {
                    options[code] = code;
                    return options;
                }, {}),
                inputPlaceholder: 'Select a line code',
                showCancelButton: true,
                confirmButtonText: 'View Flow',
                preConfirm: (selectedLineCode) => {
                    if (!selectedLineCode) {
                        Swal.showValidationMessage('Please select a line code');
                        return false;
                    }
                    return selectedLineCode;
                }
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    this.loadApprovalFlow(result.value);
                }
            });
        } else {
            this.loadApprovalFlow(lineCode);
        }
    }

    loadApprovalFlow(lineCode: string) {
        this.loading = true;
        this.selectedLineCodeForFlow = lineCode;
        
        this.service.get(`/approverauthorization/flow/${lineCode}`).subscribe({
            next: (result: any) => {
                this.approvalFlowData = result.data || [];
                this.modal.open(this.viewFlowModal, { size: 'xl', backdrop: 'static', centered: true });
                this.loading = false;
            },
            error: (error: any) => {
                this.handleError(error, 'Error loading approval flow');
                this.loading = false;
            }
        });
    }

    validateApprovalFlow() {
        Swal.fire({
            title: 'Validate Approval Flow',
            input: 'select',
            inputOptions: this.availableLineCodes.reduce((options: any, code: string) => {
                options[code] = code;
                return options;
            }, {}),
            inputPlaceholder: 'Select a line code to validate',
            showCancelButton: true,
            confirmButtonText: 'Validate',
            preConfirm: (selectedLineCode) => {
                if (!selectedLineCode) {
                    Swal.showValidationMessage('Please select a line code');
                    return false;
                }
                return selectedLineCode;
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                this.performValidation(result.value);
            }
        });
    }

    performValidation(lineCode: string) {
        this.loading = true;
        const payload = { line_code: lineCode };
        
        this.service.post('/approverauthorization/validate-flow', payload).subscribe({
            next: (result: any) => {
                const validation = result.validation;
                let message = `<strong>Line Code:</strong> ${lineCode}<br><br>`;
                
                if (validation.is_valid) {
                    message += `<div class="alert alert-success">✅ Approval flow is valid!</div>`;
                } else {
                    message += `<div class="alert alert-danger">❌ Approval flow has errors!</div>`;
                }

                message += `<strong>Flow Summary:</strong><br>`;
                message += `• Default Steps: ${validation.flow_summary.default_steps}<br>`;
                message += `• Insert Steps: ${validation.flow_summary.insert_steps}<br>`;
                message += `• Total Steps: ${validation.flow_summary.total_steps}<br><br>`;

                if (validation.errors.length > 0) {
                    message += `<strong>Errors:</strong><br>`;
                    validation.errors.forEach((error: string) => {
                        message += `• ${error}<br>`;
                    });
                    message += '<br>';
                }

                if (validation.warnings.length > 0) {
                    message += `<strong>Warnings:</strong><br>`;
                    validation.warnings.forEach((warning: string) => {
                        message += `• ${warning}<br>`;
                    });
                }

                Swal.fire({
                    title: 'Validation Results',
                    html: message,
                    icon: validation.is_valid ? 'success' : 'warning',
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal-wide'
                    }
                });
                
                this.loading = false;
            },
            error: (error: any) => {
                this.handleError(error, 'Error validating approval flow');
                this.loading = false;
            }
        });
    }

    handleError(error: any, defaultMessage: string) {
        let errorMessage = defaultMessage;

        if (error.status === 0) {
            errorMessage = 'Tidak dapat terhubung ke server. Pastikan server berjalan.';
        } else if (error.error) {
            if (error.error.message) {
                errorMessage = error.error.message;
            } else if (typeof error.error === 'string') {
                errorMessage = error.error;
            } else if (error.error.errors) {
                const validationErrors = error.error.errors;
                errorMessage = '';
                for (const field in validationErrors) {
                    errorMessage += `${field}: ${validationErrors[field].join(', ')}\n`;
                }
            }
        } else if (error.message) {
            errorMessage = error.message;
        }

        Swal.fire('Error', errorMessage, 'error');
    }

    refreshData() {
        this.loadDropdownData();
        this.loadAllData();
    }

    getShowingText(): string {
        const start = this.totalRecords > 0 ? (this.page - 1) * this.pageSize + 1 : 0;
        const end = Math.min(this.page * this.pageSize, this.totalRecords);
        
        let filterText = '';
        const activeFilters = [];
        
        if (this.searchTerm) activeFilters.push(`search: "${this.searchTerm}"`);
        if (this.filterIsActive !== undefined) activeFilters.push(`status: ${this.filterIsActive ? 'Active' : 'Inactive'}`);
        if (this.filterModelType) activeFilters.push(`model: ${this.filterModelType}`);
        if (this.filterTemplateName) activeFilters.push(`template: "${this.filterTemplateName}"`);
        if (this.filterLineCode) activeFilters.push(`line code: "${this.filterLineCode}"`);
        if (this.filterIsInsertStep !== undefined) activeFilters.push(`insert step: ${this.filterIsInsertStep ? 'Yes' : 'No'}`);
        
        if (activeFilters.length > 0) {
            filterText = ` (filtered by ${activeFilters.join(', ')})`;
        }
        
        return `Showing ${start} to ${end} of ${this.totalRecords} entries${filterText}`;
    }

    setMaxSize(totalPages?: number) {
        let baseMaxSize = 5;

        if (window.innerWidth < 576) {
            baseMaxSize = 2;
        } else if (window.innerWidth < 768) {
            baseMaxSize = 3;
        } else if (window.innerWidth < 992) {
            baseMaxSize = 5;
        } else {
            baseMaxSize = 5;
        }

        if (totalPages !== undefined) {
            this.maxSize = Math.min(totalPages, baseMaxSize);
        } else {
            this.maxSize = baseMaxSize;
        }
    }

    getModelTypeLabel(value: string): string {
        const found = this.modelTypes.find(mt => mt.value === value);
        return found ? found.label : value;
    }

    formatLineCodes(lineCodes: any): string {
        if (!lineCodes) return '-';
        if (Array.isArray(lineCodes)) {
            return lineCodes.join(', ');
        }
        return String(lineCodes);
    }

    getFlowTypeLabel(flowType: string): string {
        switch (flowType) {
            case 'default': return 'Default';
            case 'insert': return 'Insert';
            default: return flowType;
        }
    }

    getFlowTypeBadgeClass(flowType: string): string {
        switch (flowType) {
            case 'default': return 'bg-primary';
            case 'insert': return 'bg-warning';
            default: return 'bg-secondary';
        }
    }

    // Helper methods for approval flow modal
    getDefaultStepsCount(): number {
        return this.approvalFlowData.filter(step => step.flow_type === 'default').length;
    }

    getInsertStepsCount(): number {
        return this.approvalFlowData.filter(step => step.flow_type === 'insert').length;
    }
}