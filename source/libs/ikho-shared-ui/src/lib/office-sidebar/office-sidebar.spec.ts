import { TestBed } from '@angular/core/testing';
import { OfficeSidebar } from './office-sidebar';

describe('OfficeSidebar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeSidebar],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OfficeSidebar);
    fixture.componentRef.setInput('items', [{ id: 'dashboard', label: 'Dashboard', icon: 'boxes' }]);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render one nav item per entry', () => {
    const fixture = TestBed.createComponent(OfficeSidebar);
    fixture.componentRef.setInput('items', [
      { id: 'dashboard', label: 'Dashboard', icon: 'boxes' },
      { id: 'inbound', label: 'Inbound', icon: 'truck' },
    ]);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('button').length).toBe(2);
  });
});
