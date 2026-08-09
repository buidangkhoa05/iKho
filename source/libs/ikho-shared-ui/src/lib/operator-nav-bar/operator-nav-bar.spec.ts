import { TestBed } from '@angular/core/testing';
import { OperatorNavBar } from './operator-nav-bar';

describe('OperatorNavBar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperatorNavBar],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OperatorNavBar);
    fixture.componentRef.setInput('task', 'Receive PO-1042');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the current task', () => {
    const fixture = TestBed.createComponent(OperatorNavBar);
    fixture.componentRef.setInput('task', 'Receive PO-1042');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Receive PO-1042');
  });
});
