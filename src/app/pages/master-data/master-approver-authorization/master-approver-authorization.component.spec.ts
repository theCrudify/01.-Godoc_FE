import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterApproverAuthorizationComponent } from './master-approver-authorization.component';

describe('MasterApproverAuthorizationComponent', () => {
  let component: MasterApproverAuthorizationComponent;
  let fixture: ComponentFixture<MasterApproverAuthorizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterApproverAuthorizationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MasterApproverAuthorizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
