import {
  IsInt,
  Min,
  ValidateIf,
} from 'class-validator';

// PATCH /tickets/:id/assign
//   { "assignedTo": 5 }     -> assign to the Agent with id 5
//   { "assignedTo": null }  -> unassign
// The field must be sent: a missing value fails the @IsInt check.
export class AssignTicketDto {
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  assignedTo: number | null;
}
