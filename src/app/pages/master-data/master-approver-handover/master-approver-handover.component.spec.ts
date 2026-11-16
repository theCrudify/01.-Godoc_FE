import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterApproverHandoverComponent } from './master-approver-handover.component';

describe('MasterApproverHandoverComponent', () => {
  let component: MasterApproverHandoverComponent;
  let fixture: ComponentFixture<MasterApproverHandoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterApproverHandoverComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MasterApproverHandoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
