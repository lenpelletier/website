public class Date { //Question 2.2
	
	public static void main(String[] args) {
		//Recreating this output:
		//	American format: Thursday, July 18, 2019
		//	European format: Thursday 18 July 2019
		
		String day   = "Thursday";
		int date     = 18;
		String month = "July";
		int year     = 2019;
		
		System.out.println("American Format: " + day + ", " + month + " " + date + ", " + year);
		System.out.println("European Format: " + day + ", " + date + " " + month + ", " + year);
	}
}
